# 【设计模式】单例模式

```
tags:
  - 学习
  - 设计模式
originContent: ''
categories:
  - 编程艺术

date: 2020-06-03 15:42:12
```

- 为什么要使用单例？
- 单例存在哪些问题？有何解决方案？
- 如何设计实现一个集群环境下的分布式单例模式？


## 为什么要使用单例？

### 处理资源访问冲突

我们自定义实现了一个往文件中打印日志的 Logger 类。具体的代码实现如下所示：
```
public class Logger {
  private FileWriter writer;
  
  public Logger() {
    File file = new File("/Users/wangzheng/log.txt");
    writer = new FileWriter(file, true); //true表示追加写入
  }
  
  public void log(String message) {
    writer.write(mesasge);
  }
}

// Logger类的应用示例：
public class UserController {
  private Logger logger = new Logger();
  
  public void login(String username, String password) {
    // ...省略业务逻辑代码...
    logger.log(username + " logined!");
  }
}

public class OrderController {
  private Logger logger = new Logger();
  
  public void create(OrderVo order) {
    // ...省略业务逻辑代码...
    logger.log("Created an order: " + order.toString());
  }
}
```

这段代码存在如下问题：
所有的日志都写入到同一个文件 /Users/wangzheng/log.txt 中。在`UserController`和`OrderController`中，我们分别创建两个 Logger 对象。在 Web 容器的 Servlet 多线程环境下，如果两个 Servlet 线程同时分别执行`login()`和`create()`两个函数，并且同时写日志到 log.txt 文件中，那就有可能存在日志信息互相覆盖的情况。

为什么会相互覆盖呢？
在多线程环境下，如果两个线程同时给同一个共享变量加 1，因为共享变量是竞争资源，所以，共享变量最后的结果有可能并不是加了 2，而是只加了 1。同理，这里的 log.txt 文件也是竞争资源，两个线程同时往里面写数据，就有可能存在互相覆盖的情况。如图：
![竞争资源](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/j5BRZUlgKbUG5yYXn162*aJ21Vrdf*VB7TnoQOhI2axiDm0AEz65zJhrLkCW*KylwDV4A2ObQsi9PRdaaUgMRw!!/b&bo=QQeYAgAAAAADB*4!&rf=viewer_4)

最容易想到的解决方法是给`log()`函数加互斥锁（Java 中可以通过 synchronized 的关键字），同一时刻只允许一个线程调用执行`log()`函数：
```
public class Logger {
  private FileWriter writer;

  public Logger() {
    File file = new File("/Users/wangzheng/log.txt");
    writer = new FileWriter(file, true); //true表示追加写入
  }
  
  public void log(String message) {
    synchronized(this) {
      writer.write(mesasge);
    }
  }
}
```

但这种锁只是一个对象级别的锁，**不同的对象之间并不共享同一把锁**。在不同的线程下，通过不同的对象调用执行`log()`函数，锁并不会起作用，仍然有可能存在写入日志互相覆盖的问题。

![对象级别的锁](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/j5BRZUlgKbUG5yYXn162*VXE8y2QHcR5*BOoGrMgcrrpZWNxn6Uc8.ST5YHXnSSHP25ZS7rqyLtjvhXOj4f6TQ!!/b&bo=DwJxAQAAAAADB18!&rf=viewer_4)

> `log()`函数加不加对象级别的锁，其实都没有关系。因为 FileWriter 本身就是线程安全的，它的内部实现中本身就加了对象级别的锁，因此，在外层调用`write()`函数的时候，再加对象级别的锁实际上是多此一举。
> 因为不同的 Logger 对象不共享 FileWriter 对象，所以 FileWriter 对象级别的锁也解决不了数据写入互相覆盖的问题。

我们只需要把对象级别的锁，换成**类级别的锁**就可以了。让所有的对象都共享同一把锁。

```
public class Logger {
  private FileWriter writer;

  public Logger() {
    File file = new File("/Users/wangzheng/log.txt");
    writer = new FileWriter(file, true); //true表示追加写入
  }
  
  public void log(String message) {
    synchronized(Logger.class) { // 类级别的锁
      writer.write(mesasge);
    }
  }
}
```

#### 单例模式是一种解决方案

实际上，除了使用类级别锁之外，解决资源竞争问题的办法还有很多，**分布式锁**是最常听到的一种解决方案（不过，实现一个安全可靠、无 bug、高性能的分布式锁，并不是件容易的事情）。除此之外，**并发队列**（比如 Java 中的 BlockingQueue）也可以解决这个问题：多个线程同时往并发队列里写日志，一个单独的线程负责将并发队列中的数据，写入到日志文件（这种方式实现起来也稍微有点复杂）。

相对于这两种解决方案，单例模式的解决思路就简单一些了。单例模式相对于之前类级别锁的好处是，不用创建那么多 Logger 对象，一方面**节省内存空间**，另一方面**节省系统文件句柄**（对于操作系统来说，文件句柄也是一种资源，不能随便浪费）。
我们将 Logger 设计成一个单例类，程序中只允许创建一个 Logger 对象，所有的线程共享使用的这一个 Logger 对象，共享一个 FileWriter 对象，而 FileWriter 本身是对象级别线程安全的，也就避免了多线程情况下写日志会互相覆盖的问题。

```
public class Logger {
  private FileWriter writer;
  private static final Logger instance = new Logger();

  private Logger() {
    File file = new File("/Users/wangzheng/log.txt");
    writer = new FileWriter(file, true); //true表示追加写入
  }
  
  public static Logger getInstance() {
    return instance;
  }
  
  public void log(String message) {
    writer.write(mesasge);
  }
}

// Logger类的应用示例：
public class UserController {
  public void login(String username, String password) {
    // ...省略业务逻辑代码...
    Logger.getInstance().log(username + " logined!");
  }
}

public class OrderController {  
  public void create(OrderVo order) {
    // ...省略业务逻辑代码...
    Logger.getInstance().log("Created a order: " + order.toString());
  }
}
```

### 表示全局唯一类

从业务概念上说，有些数据在系统中只应保存一份，那就比较适合设计为单例类。

比如，配置信息类。系统中只有一份配置文件，当它被加载到内存之后以对象的形式存在，也理所应当只有一份。

再比如，唯一递增 ID 号码生成器。如果程序中有两个对象，那就会存在生成重复 ID 的情况，所以应该将 ID 生成器类设计为单例：
```
import java.util.concurrent.atomic.AtomicLong;
public class IdGenerator {
  // AtomicLong是一个Java并发库中提供的一个原子变量类型,
  // 它将一些线程不安全需要加锁的复合操作封装为了线程安全的原子操作，
  // 比如下面会用到的incrementAndGet().
  private AtomicLong id = new AtomicLong(0);
  private static final IdGenerator instance = new IdGenerator();
  private IdGenerator() {}
  public static IdGenerator getInstance() {
    return instance;
  }
  public long getId() { 
    return id.incrementAndGet();
  }
}

// IdGenerator使用举例
long id = IdGenerator.getInstance().getId();
```

> 实际上，上面两个代码实例（Logger、IdGenerator）设计得都并不优雅，还存在一些问题。
> 单例的实现方法有：饿汉式、懒汉式、双检测、静态类、枚举。饿汉式不能延迟加载，懒汉式在并发时存在效率问题。

## 单例存在哪些问题？

### 单例对 OOP 特性的支持不友好

单例模式对抽象、继承、多态都支持得不好。还是通过 IdGenerator 这个例子来讲解：

```
public class Order {
  public void create(...) {
    //...
    long id = IdGenerator.getInstance().getId();
    //...
  }
}

public class User {
  public void create(...) {
    // ...
    long id = IdGenerator.getInstance().getId();
    //...
  }
}
```

IdGenerator 的使用方式违背了**基于接口而非实现**的设计原则，也就违背了广义上理解的 OOP 的抽象特性。
如果未来我们希望针对不同的业务采用不同的 ID 生成算法。比如，订单 ID 和用户 ID 采用不同的 ID 生成器来生成。为了应对这个需求变化，我们需要修改所有用到 IdGenerator 类的地方，这样代码的改动就会比较大。

从理论上来讲，单例类也可以被继承、也可以实现多态，只是实现起来会非常奇怪，会导致代码的可读性变差。所以，一旦你选择将某个类设计成到单例类，也就意味着放弃了继承和多态这两个强有力的面向对象特性，也就相当于损失了可以应对未来需求变化的扩展性。

### 单例会隐藏类之间的依赖关系

通过构造函数、参数传递等方式声明的类之间的依赖关系，我们通过查看函数的定义，就能很容易识别出来。但是，单例类不需要显示创建、不需要依赖参数传递，在函数中直接调用就可以了。如果代码比较复杂，这种调用关系就会非常隐蔽，降低代码的可读性。

### 单例对代码的扩展性不友好

单例类只能有一个对象实例，如果未来我们需要在代码中创建两个或多个实例，那就要对代码有比较大的改动。
数据库连接池、线程池这类的资源池，最好还是不要设计成单例类。实际上，一些开源的数据库连接池、线程池也确实没有设计成单例类。

### 单例对代码的可测试性不友好

如果单例类依赖比较重的外部资源，比如 DB，我们在写单元测试的时候，希望能通过 mock 的方式将它替换掉。而单例类这种硬编码式的使用方式，导致无法实现 mock 替换。

除此之外，如果单例类持有成员变量（比如 IdGenerator 中的 id 成员变量），那它实际上相当于一种全局变量，被所有的代码共享。如果这个全局变量是可变的，那我们在编写单元测试的时候，还需要注意不同测试用例之间，修改了单例类中的同一个成员变量的值，从而导致测试结果互相影响的问题。

### 单例不支持有参数的构造函数

比如我们创建一个连接池的单例对象，我们没法通过参数来指定连接池的大小。

当然将参数放到 getIntance() 方法中也不是不行，但实现起来不够优雅。推荐的解决方法是，将参数放到另外一个全局变量中。

## 有何替代解决方案？

```
// 1. 老的使用方式
public demofunction() {
  //...
  long id = IdGenerator.getInstance().getId();
  //...
}

// 2. 新的使用方式：依赖注入
public demofunction(IdGenerator idGenerator) {
  long id = idGenerator.getId();
}
// 外部调用demofunction()的时候，传入idGenerator
IdGenerator idGenerator = IdGenerator.getInsance();
demofunction(idGenerator);
```
我们将单例生成的对象，作为参数传递给函数（也可以通过构造函数传递给类的成员变量），可以解决单例隐藏类之间依赖关系的问题。
不过，对于单例存在的其他问题，比如对 OOP 特性、扩展性、可测性不友好等问题，还是无法解决。

如果要完全解决这些问题，我们可能要从根上，寻找其他方式来实现全局唯一类。
实际上，类对象的全局唯一性可以通过多种不同的方式来保证。我们既可以通过单例模式来强制保证，也可以通过工厂模式、IOC 容器（比如 Spring IOC 容器）来保证，还可以通过程序员自己来保证（自己保证不要创建两个类对象）。

## 如何理解单例中的唯一性？

单例的定义：“一个类只允许创建唯一一个对象（或者实例），那这个类就是一个单例类，这种设计模式就叫作单例设计模式，简称单例模式。”

单例模式创建的对象是**进程唯一**的。

我们编写的代码，通过编译、链接，组织在一起，就构成了一个操作系统可以执行的文件，也就是我们平时所说的“可执行文件”（比如 Windows 下的 exe 文件）。可执行文件实际上就是代码被翻译成操作系统可理解的一组指令。
当我们使用命令行或者双击运行这个可执行文件的时候，操作系统会启动一个进程，将这个执行文件从磁盘加载到自己的进程地址空间（可以理解操作系统为进程分配的内存存储区，用来存储代码和数据）。接着，进程就一条一条地执行可执行文件中包含的代码。
进程之间是不共享地址空间的，如果我们在一个进程中创建另外一个进程（比如`fork()`语句），操作系统会给新进程分配新的地址空间，并且将老进程地址空间的所有内容，重新拷贝一份到新进程的地址空间中，这些内容包括代码、数据。

单例类在老进程中存在且只能存在一个对象，在新进程中也会存在且只能存在一个对象。而且，这两个对象并不是同一个对象。

### 如何实现线程唯一的单例？

**线程唯一**单例的代码实现很简单，如下所示。
```
public class IdGenerator {
  private AtomicLong id = new AtomicLong(0);

  private static final ConcurrentHashMap<Long, IdGenerator> instances
          = new ConcurrentHashMap<>();

  private IdGenerator() {}

  public static IdGenerator getInstance() {
    Long currentThreadId = Thread.currentThread().getId();
    instances.putIfAbsent(currentThreadId, new IdGenerator());
    return instances.get(currentThreadId);
  }

  public long getId() {
    return id.incrementAndGet();
  }
}
```
在代码中，我们通过一个 HashMap 来存储对象，其中 key 是线程 ID，value 是对象。这样我们就可以做到，不同的线程对应不同的对象，同一个线程只能对应一个对象。

## 如何实现集群环境下的单例？

“进程唯一”指的是进程内唯一、进程间不唯一。“线程唯一”指的是线程内唯一、线程间不唯一。**集群相当于多个进程构成的一个集合**，“集群唯一”就相当于是进程内唯一、进程间也唯一。也就是说，不同的进程间共享同一个对象，不能创建同一个类的多个对象。

经典的单例模式是进程内唯一的，那如何实现一个**进程间也唯一**的单例呢？如果严格按照不同的进程间共享同一个对象来实现，那集群唯一的单例实现起来就有点难度了。

具体来说，我们需要把这个单例对象序列化并存储到外部共享存储区（比如文件）。进程在使用这个单例对象的时候，需要先从外部共享存储区中将它读取到内存，并反序列化成对象，然后再使用，使用完成之后还需要再存储回外部共享存储区。
为了保证任何时刻，在进程间都只有一份对象存在，一个进程在获取到对象之后，需要对对象加锁，避免其他进程再将其获取。在进程使用完这个对象之后，还需要显式地将对象从内存中删除，并且释放对对象的加锁。按照这个思路，我用伪代码实现了一下这个过程，具体如下所示：
```
public class IdGenerator {
  private AtomicLong id = new AtomicLong(0);
  private static IdGenerator instance;
  private static SharedObjectStorage storage = FileSharedObjectStorage(/*入参省略，比如文件地址*/);
  private static DistributedLock lock = new DistributedLock();
  
  private IdGenerator() {}

  public synchronized static IdGenerator getInstance() 
    if (instance == null) {
      lock.lock();
      instance = storage.load(IdGenerator.class);
    }
    return instance;
  }
  
  public synchroinzed void freeInstance() {
    storage.save(this, IdGeneator.class);
    instance = null; //释放对象
    lock.unlock();
  }
  
  public long getId() { 
    return id.incrementAndGet();
  }
}

// IdGenerator使用举例
IdGenerator idGeneator = IdGenerator.getInstance();
long id = idGenerator.getId();
IdGenerator.freeInstance();
```

## 如何实现一个多例模式？

“多例”指的是，一个类可以创建多个对象，但是个数是有限制的。

用代码简单示例一下三例模式：
```
public class BackendServer {
  private long serverNo;
  private String serverAddress;

  private static final int SERVER_COUNT = 3;
  private static final Map<Long, BackendServer> serverInstances = new HashMap<>();

  static {
    serverInstances.put(1L, new BackendServer(1L, "192.134.22.138:8080"));
    serverInstances.put(2L, new BackendServer(2L, "192.134.22.139:8080"));
    serverInstances.put(3L, new BackendServer(3L, "192.134.22.140:8080"));
  }

  private BackendServer(long serverNo, String serverAddress) {
    this.serverNo = serverNo;
    this.serverAddress = serverAddress;
  }

  public BackendServer getInstance(long serverNo) {
    return serverInstances.get(serverNo);
  }

  public BackendServer getRandomInstance() {
    Random r = new Random();
    int no = r.nextInt(SERVER_COUNT)+1;
    return serverInstances.get(no);
  }
}
```

实际上，对于多例模式，还有一种理解方式：同一类型的只能创建一个对象，不同类型的可以创建多个对象。这里的“类型”如何理解呢？我们还是通过一个例子来解释一下，具体代码如下所示。在代码中，logger name 就是刚刚说的“类型”，同一个 logger name 获取到的对象实例是相同的，不同的 logger name 获取到的对象实例是不同的。
```
public class Logger {
  private static final ConcurrentHashMap<String, Logger> instances
          = new ConcurrentHashMap<>();

  private Logger() {}

  public static Logger getInstance(String loggerName) {
    instances.putIfAbsent(loggerName, new Logger());
    return instances.get(loggerName);
  }

  public void log() {
    //...
  }
}

//l1==l2, l1!=l3
Logger l1 = Logger.getInstance("User.class");
Logger l2 = Logger.getInstance("User.class");
Logger l3 = Logger.getInstance("Order.class");
```

这种多例模式的理解方式有点类似工厂模式。它跟工厂模式的不同之处是，多例模式创建的对象都是同一个类的对象，而工厂模式创建的是不同子类的对象。
实际上，它还有点类似享元模式。

除此之外，枚举类型也相当于多例模式，一个类型只能对应一个对象，一个类可以创建多个对象。