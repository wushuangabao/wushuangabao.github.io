# 【设计模式】设计原则 SOLID

```
tags:
  - 设计模式
categories:
  - 编程艺术

date: 2019-12-17 13:35:09
```

SOLID 原则并非单纯的 1 个原则，而是由 5 个设计原则组成的，它们分别是：
- 单一职责原则
- 开闭原则
- 里式替换原则
- 接口隔离原则
- 依赖反转原则


## 单一职责原则（SRP）

> Single Responsibility Principle: A class or module should have a single reponsibility.

关于 class 和 module 有两种理解方式：
1. 把模块看作比类更加抽象的概念，类也可以看作模块。
2. 把模块看作比类更加粗粒度的代码块，模块中包含多个类，多个类组成一个模块。

接下来只从“类”设计的角度，来讲解如何应用这个设计原则。对于“模块”来说，可以自行引申。

一个类只负责完成一个职责或者功能。也就是说，不要设计大而全的类，要设计粒度小、功能单一的类。换个角度来讲就是，一个类包含了两个或者两个以上业务不相干的功能，那我们就说它职责不够单一，应该将它拆分成多个功能更加单一、粒度更细的类。

### 如何判断类的职责是否足够单一？

大部分情况下，类里的方法是归为同一类功能，还是归为不相关的两类功能，并不是那么容易判定的。在真实的软件开发中，对于一个类是否职责单一的判定，是很难拿捏的。

在一个社交产品中，用下面的类来记录用户信息。
```
public class UserInfo {
  private long userId;
  private String username;
  private String email;
  private String telephone;
  private long createTime;
  private long lastLoginTime;
  private String avatarUrl;
  private String provinceOfAddress; // 省
  private String cityOfAddress; // 市
  private String regionOfAddress; // 区 
  private String detailedAddress; // 详细地址
  // ...省略其他属性和方法...
}
```

有两种不同的观点：
1. UserInfo 类包含的都是跟用户相关的信息，所有的属性和方法都隶属于用户这样一个业务模型，满足单一职责原则；
2. 地址信息在 UserInfo 类中，所占的比重比较高，可以继续拆分成独立的 UserAddress 类，UserInfo 只保留除 Address 之外的其他信息，拆分之后的两个类的职责更加单一。

不同的应用场景、不同阶段的需求背景下，对同一个类的职责是否单一的判定，可能都是不一样的。在某种应用场景或者当下的需求背景下，一个类的设计可能已经满足单一职责原则了，但如果换个应用场景或着在未来的某个需求背景下，可能就不满足了，需要继续拆分成粒度更细的类。

除此之外，从不同的业务层面去看待同一个类的设计，对类是否职责单一，也会有不同的认识。比如，例子中的 UserInfo 类。如果我们从“用户”这个业务层面来看，UserInfo 包含的信息都属于用户，满足职责单一原则。如果我们从更加细分的“用户展示信息”“地址信息”“登录认证信息”等等这些更细粒度的业务层面来看，那 UserInfo 就应该继续拆分。

综上所述，评价一个类的职责是否足够单一，我们并没有一个非常明确的、可以量化的标准，可以说，这是件非常主观、仁者见仁智者见智的事情。实际上，在真正的软件开发中，我们也没必要过于未雨绸缪，过度设计。所以，我们可以先写一个粗粒度的类，满足业务需求。随着业务的发展，如果粗粒度的类越来越庞大，代码越来越多，这个时候，我们就可以将这个粗粒度的类，拆分成几个更细粒度的类。这就是所谓的**持续重构**。

几条判断原则：
- 类中的代码行数、函数或属性过多，会影响代码的可读性和可维护性，我们就需要考虑对类进行拆分；
- 类依赖的其他类过多，或者依赖类的其他类过多，不符合高内聚、低耦合的设计思想，我们就需要考虑对类进行拆分；
- 私有方法过多，我们就要考虑能否将私有方法独立到新的类中，设置为 public 方法，供更多的类使用，从而提高代码的复用性；
- 比较难给类起一个合适名字，很难用一个业务名词概括，或者只能用一些笼统的 Manager、Context 之类的词语来命名，这就说明类的职责定义得可能不够清晰；
- 类中大量的方法都是集中操作类中的某几个属性，比如，在 UserInfo 例子中，如果一半的方法都是在操作 address 信息，那就可以考虑将这几个属性和对应的方法拆分出来。

### 类的职责是否设计得越专一越好？

答案是否定的。

例：Serialization 类实现了一个简单协议的序列化和反序列功能，具体代码如下：
```
/**
 * Protocol format: identifier-string;{gson string}
 * For example: UEUEUE;{"a":"A","b":"B"}
 */
public class Serialization {
  private static final String IDENTIFIER_STRING = "UEUEUE;";
  private Gson gson;
  
  public Serialization() {
    this.gson = new Gson();
  }
  
  public String serialize(Map<String, String> object) {
    StringBuilder textBuilder = new StringBuilder();
    textBuilder.append(IDENTIFIER_STRING);
    textBuilder.append(gson.toJson(object));
    return textBuilder.toString();
  }
  
  public Map<String, String> deserialize(String text) {
    if (!text.startsWith(IDENTIFIER_STRING)) {
        return Collections.emptyMap();
    }
    String gsonStr = text.substring(IDENTIFIER_STRING.length());
    return gson.fromJson(gsonStr, Map.class);
  }
}
```

如果我们想让类的职责更加单一，我们对 Serialization 类进一步拆分，拆分成一个只负责序列化工作的 Serializer 类和另一个只负责反序列化工作的 Deserializer 类。拆分后的具体代码如下所示：
```
public class Serializer {
  private static final String IDENTIFIER_STRING = "UEUEUE;";
  private Gson gson;
  
  public Serializer() {
    this.gson = new Gson();
  }
  
  public String serialize(Map<String, String> object) {
    StringBuilder textBuilder = new StringBuilder();
    textBuilder.append(IDENTIFIER_STRING);
    textBuilder.append(gson.toJson(object));
    return textBuilder.toString();
  }
}

public class Deserializer {
  private static final String IDENTIFIER_STRING = "UEUEUE;";
  private Gson gson;
  
  public Deserializer() {
    this.gson = new Gson();
  }
  
  public Map<String, String> deserialize(String text) {
    if (!text.startsWith(IDENTIFIER_STRING)) {
        return Collections.emptyMap();
    }
    String gsonStr = text.substring(IDENTIFIER_STRING.length());
    return gson.fromJson(gsonStr, Map.class);
  }
}
```

虽然经过拆分之后，Serializer 类和 Deserializer 类的职责更加单一了，但也随之带来了新的问题：
- 如果我们修改了协议的格式，数据标识从“UEUEUE”改为“DFDFDF”，或者序列化方式从 JSON 改为了 XML，那 Serializer 类和 Deserializer 类都需要做相应的修改，代码的**内聚性**显然没有原来 Serialization 高了。
- 而且，如果我们仅仅对 Serializer 类做了协议修改，而忘记了修改 Deserializer 类的代码，那就会导致序列化、反序列化不匹配，程序运行出错，也就是说，拆分之后，代码的**可维护性**变差了。

不管是应用设计原则还是设计模式，最终目的还是**提高代码的可读性、可扩展性、复用性、可维护性等**。我们在考虑应用某一个设计原则是否合理的时候，也可以以此作为最终的考量标准。


## 开闭原则（OCP）

> Open Closed Principle: software entities (modules, classes, functions, etc.) should be open for extension , but closed for modification.

扩展性是代码质量最重要的衡量标准之一。在 23 种经典设计模式中，大部分设计模式都是为了解决代码的扩展性问题而存在的，主要遵从的设计原则就是开闭原则。

### 如何理解“对扩展开放、修改封闭”？

添加一个新的功能应该是，在已有代码基础上扩展代码（新增模块、类、方法等），而非修改已有代码（修改模块、类、方法等）。

举例：有一段API接口监控告警的代码如下：
```
public class Alert {
  private AlertRule rule; //警告规则，可以自由设置
  private Notification notification; //负责执行告警通知

  public Alert(AlertRule rule, Notification notification) {
    this.rule = rule;
    this.notification = notification;
  }

  public void check(String api, long requestCount, long errorCount, long durationOfSeconds) {
    long tps = requestCount / durationOfSeconds;
    if (tps > rule.getMatchedRule(api).getMaxTps()) {
      notification.notify(NotificationEmergencyLevel.URGENCY, "...");
    }
    if (errorCount > rule.getMatchedRule(api).getMaxErrorCount()) {
      notification.notify(NotificationEmergencyLevel.SEVERE, "...");
    }
  }
}
```

现在我们需要添加一个功能：当每秒钟接口超时请求个数，超过某个预先设置的最大阈值时，也要触发告警通知。改动代码如下。
```
public class Alert {
  // ...省略AlertRule/Notification属性和构造函数...
  
  // 改动一：添加参数timeoutCount
  public void check(String api, long requestCount, long errorCount, long timeoutCount, long durationOfSeconds) {
    long tps = requestCount / durationOfSeconds;
    if (tps > rule.getMatchedRule(api).getMaxTps()) {
      notification.notify(NotificationEmergencyLevel.URGENCY, "...");
    }
    if (errorCount > rule.getMatchedRule(api).getMaxErrorCount()) {
      notification.notify(NotificationEmergencyLevel.SEVERE, "...");
    }
    // 改动二：添加接口超时处理逻辑
    long timeoutTps = timeoutCount / durationOfSeconds;
    if (timeoutTps > rule.getMatchedRule(api).getMaxTimeoutTps()) {
      notification.notify(NotificationEmergencyLevel.URGENCY, "...");
    }
  }
}
```

以上的代码改动其实存在挺多问题。一方面，我们对接口进行了修改，这意味着调用这个接口的代码都要做相应的修改。另一方面，修改了check函数，相应的单元测试都需要修改。

如果我们遵循“对扩展开放、对修改关闭”，如何通过扩展的方式来实现同样的功能呢？我们需要重构一下之前的Alert代码，让它的扩展性更好一些。重构主要包含两部分：
- 将check函数的多个入参封装成ApiStatInfo类；
- 引入handler的概念，将if判断逻辑分散在各个handler中。

```
public class Alert {
  private List<AlertHandler> alertHandlers = new ArrayList<>();
  
  public void addAlertHandler(AlertHandler alertHandler) {
    this.alertHandlers.add(alertHandler);
  }

  public void check(ApiStatInfo apiStatInfo) {
    for (AlertHandler handler : alertHandlers) {
      handler.check(apiStatInfo);
    }
  }
}

public class ApiStatInfo { //省略constructor/getter/setter方法
  private String api;
  private long requestCount;
  private long errorCount;
  private long durationOfSeconds;
}

public abstract class AlertHandler {
  protected AlertRule rule;
  protected Notification notification;
  public AlertHandler(AlertRule rule, Notification notification) {
    this.rule = rule;
    this.notification = notification;
  }
  public abstract void check(ApiStatInfo apiStatInfo);
}

public class TpsAlertHandler extends AlertHandler {
  public TpsAlertHandler(AlertRule rule, Notification notification) {
    super(rule, notification);
  }

  @Override
  public void check(ApiStatInfo apiStatInfo) {
    long tps = apiStatInfo.getRequestCount()/ apiStatInfo.getDurationOfSeconds();
    if (tps > rule.getMatchedRule(apiStatInfo.getApi()).getMaxTps()) {
      notification.notify(NotificationEmergencyLevel.URGENCY, "...");
    }
  }
}

public class ErrorAlertHandler extends AlertHandler {
  public ErrorAlertHandler(AlertRule rule, Notification notification){
    super(rule, notification);
  }

  @Override
  public void check(ApiStatInfo apiStatInfo) {
    if (apiStatInfo.getErrorCount() > rule.getMatchedRule(apiStatInfo.getApi()).getMaxErrorCount()) {
      notification.notify(NotificationEmergencyLevel.SEVERE, "...");
    }
  }
}
```
同时构建一个单例类ApplicationContext，负责Alert的创建、组装（alertRule和notification的依赖注入）、初始化（添加handlers）工作。
```
public class ApplicationContext {
  private AlertRule alertRule;
  private Notification notification;
  private Alert alert;
  
  public void initializeBeans() {
    alertRule = new AlertRule(/*.省略参数.*/); //省略一些初始化代码
    notification = new Notification(/*.省略参数.*/); //省略一些初始化代码
    alert = new Alert();
    alert.addAlertHandler(new TpsAlertHandler(alertRule, notification));
    alert.addAlertHandler(new ErrorAlertHandler(alertRule, notification));
  }
  public Alert getAlert() { return alert; }

  // 饿汉式单例
  private static final ApplicationContext instance = new ApplicationContext();
  private ApplicationContext() {
    instance.initializeBeans();
  }
  public static ApplicationContext getInstance() {
    return instance;
  }
}

public class Demo {
  public static void main(String[] args) {
    ApiStatInfo apiStatInfo = new ApiStatInfo();
    // ...省略设置apiStatInfo数据值的代码
    ApplicationContext.getInstance().getAlert().check(apiStatInfo);
  }
}
```

如果再添加上面讲到的新功能，主要的改动有四处：
1. 在 ApiStatInfo 类中添加新的属性 timeoutCount。
2. 添加新的 TimeoutAlertHander 类。
3. 在 ApplicationContext 类的 initializeBeans() 方法中，往 alert 对象中注册新的 timeoutAlertHandler。
4. 在使用 Alert 类的时候，需要给 check() 函数的入参 apiStatInfo 对象设置 timeoutCount 的值。

重构之后的代码更加灵活和易扩展。如果我们要想添加新的告警逻辑，只需要基于扩展的方式创建新的 handler 类即可，不需要改动原来的 check 函数的逻辑。而且，我们只需要为新的 handler 类添加单元测试，老的单元测试都不会失败，也不用修改

### 修改代码就意味着 违背开放封闭原则吗？

上面的四处改动中，改动一、三、四貌似不是基于扩展而是基于修改的方式来完成的。那它们不就违背开闭原则了吗？

给类中添加新的属性和方法，算作“修改”还是“扩展”？

开闭原则的定义：软件实体（模块、类、方法等）应该“对扩展开放、对修改关闭”。从定义中，我们可以看出，开闭原则可以应用在不同粒度的代码中，可以是模块，也可以类，还可以是方法（及其属性）。
**同样一个代码改动，在粗代码粒度下，被认定为“修改”，在细代码粒度下，又可以被认定为“扩展”。**
只要它**没有破坏原有的代码的正常运行，没有破坏原有的单元测试**，我们就可以说，这是一个合格的代码改动。

最后，要认识到：添加一个新功能，不可能任何模块、类、方法的代码都不“修改”，这个是做不到的。
类需要创建、组装、并且做一些初始化操作，才能构建成可运行的的程序，这部分代码的修改是在所难免的。
我们要做的是尽量让修改操作更集中、更少、更上层，**尽量让最核心、最复杂的那部分逻辑代码满足开闭原则**。

### 如何做到“对扩展开放、修改关闭”？

在讲具体的方法论之前，我们先来看一些更加偏向顶层的指导思想。为了尽量写出扩展性好的代码，我们要时刻具备**扩展意识、抽象意识、封装意识**。

在写代码时，我们要花点时间往前多思考一下，这段代码未来可能有哪些需求变更、如何设计代码结构，**事先留好扩展点**，以便在未来需求变更的时候，不需要改动代码整体结构、做到最小代码改动的情况下，新的代码能够很灵活地插入到扩展点上。

在识别出代码可变部分和不可变部分之后，我们要将可变部分封装起来，隔离变化，提供抽象化的不可变接口，给上层系统使用。当具体的实现发生变化的时候，我们只需要基于相同的抽象接口，扩展一个新的实现，替换掉老的实现即可，上游系统的代码几乎不需要修改。

在众多的设计原则、思想、模式中，最常用来提高代码扩展性的方法有：多态、依赖注入、基于接口而非实现编程，以及大部分的设计模式（比如，装饰、策略、模板、职责链、状态等）。

即便我们对业务、对系统有足够的了解，那也不可能识别出所有的扩展点，即便你能识别出所有的扩展点，为这些地方都预留扩展点，这样做的成本也是不可接受的。我们没必要为一些遥远的、不一定发生的需求去提前买单，做过度设计。

最合理的做法是，对于一些比较确定的、短期内可能就会扩展，或者需求改动对代码结构影响比较大的情况，或者实现成本不高的扩展点，在编写代码的时候之后，我们就可以事先做些扩展性设计。但对于一些不确定未来是否要支持的需求，或者实现起来比较复杂的扩展点，我们可以等到有需求驱动的时候，再通过重构代码的方式来支持扩展的需求。

开闭原则也不是免费的。有些情况下，代码的扩展性会跟可读性相冲突。比如前面举的 Alert 的例子，为了更好地支持扩展性，我们重构了代码，重构后的代码比之前的代码复杂很多，理解起来也更加有难度。
很多时候，**我们要在扩展性和可读性之间做权衡。**如果告警规则很多、很复杂，check 函数的 if 语句、代码逻辑就会很多、很复杂，相应的代码行数也会很多，可读性、可维护性就会变差，那重构之后的代码实现思路就是更加合理的选择了。

## 里式替换原则（LSP）

Liskov Substitution Principle:
- Barbara Liskov: If S is a subtype of T, then objects of type T may be replaced with objects of type S, without breaking the program.
- Robert Martin: Functions that use pointers of references to base classes must be able to use objects of derived classes without knowing it.

### 如何理解“里式替换原则”？

子类对象（object of subtype/derived class）能够替换程序（program）中父类对象（object of base/parent class）出现的任何地方，并且保证原来程序的逻辑行为（behavior）不变及正确性不被破坏。

比如，下面的代码中，父类 Transporter 使用 org.apache.http 库中的 HttpClient 类来传输网络数据。子类 SecurityTransporter 继承父类 Transporter，增加了额外的功能，支持传输 appId 和 appToken 安全认证信息。
```
public class Transporter {
  private HttpClient httpClient;
  
  public Transporter(HttpClient httpClient) {
    this.httpClient = httpClient;
  }

  public Response sendRequest(Request request) {
    // ...use httpClient to send request
  }
}

public class SecurityTransporter extends Transporter {
  private String appId;
  private String appToken;

  public SecurityTransporter(HttpClient httpClient, String appId, String appToken) {
    super(httpClient);
    this.appId = appId;
    this.appToken = appToken;
  }

  @Override
  public Response sendRequest(Request request) {
    if (StringUtils.isNotBlank(appId) && StringUtils.isNotBlank(appToken)) {
      request.addPayload("app-id", appId);
      request.addPayload("app-token", appToken);
    }
    return super.sendRequest(request);
  }
}

public class Demo {    
  public void demoFunction(Transporter transporter) {    
    Reuqest request = new Request();
    //...省略设置request中数据值的代码...
    Response response = transporter.sendRequest(request);
    //...省略其他逻辑...
  }
}

// 里式替换原则
Demo demo = new Demo();
demo.demofunction(new SecurityTransporter(/*省略参数*/););
```

子类 SecurityTransporter 的设计完全符合里式替换原则，可以替换父类出现的任何位置，并且原来代码的逻辑行为不变且正确性也没有被破坏。

从刚才例子来看，里氏替换原则跟多态有点类似。但实际上它们完全是两回事。还是原来的例子，我们改造了一下代码：
```
// 改造前：
public class SecurityTransporter extends Transporter {
  //...省略其他代码..
  @Override
  public Response sendRequest(Request request) {
    if (StringUtils.isNotBlank(appId) && StringUtils.isNotBlank(appToken)) {
      request.addPayload("app-id", appId);
      request.addPayload("app-token", appToken);
    }
    return super.sendRequest(request);
  }
}

// 改造后：
public class SecurityTransporter extends Transporter {
  //...省略其他代码..
  @Override
  public Response sendRequest(Request request) {
    if (StringUtils.isBlank(appId) || StringUtils.isBlank(appToken)) {
      throw new NoAuthorizationRuntimeException(...);
    }
    request.addPayload("app-id", appId);
    request.addPayload("app-token", appToken);
    return super.sendRequest(request);
  }
}
```

虽然改造之后的代码仍然可以通过 Java 的多态语法，动态地用子类 SecurityTransporter 来替换父类 Transporter，也并不会导致程序编译或者运行报错。但是，从设计思路上来讲，SecurityTransporter 的设计是不符合里式替换原则的。
因为如果传递进 demoFunction() 函数的是父类 Transporter 对象，那 demoFunction() 函数并不会有异常抛出，但如果传递给 demoFunction() 函数的是子类 SecurityTransporter 对象，那 demoFunction() 有可能会有异常抛出，整个程序的逻辑行为有了改变。

总结：多态是一种代码实现的思路，而里式替换是一种设计原则，是用来指导继承关系中的子类该如何设计的（子类的设计要保证在替换父类的时候，不改变原有程序的逻辑以及不破坏原有程序的正确性）。

### Design By Contract

里式替换原则还有一个描述，就是“Design By Contract”，按照协议来设计。

子类在设计的时候，要遵守父类的行为约定（或者叫协议）。父类定义了函数的行为约定，那子类可以改变函数的内部实现逻辑，但不能改变函数原有的行为约定。这里的行为约定包括：
- 函数声明要实现的功能；
- 对输入、输出、异常的约定；
- 甚至包括注释中所罗列的任何特殊说明。

实际上，父类和子类之间的关系，也可以替换成接口和实现类之间的关系。

几个违反里氏替换原则的例子：
1. 子类违背父类声明要实现的功能。比如父类按金额大小给订单排序，而子类重写之后却按照创建日期来排序。
2. 子类违背父类对输入、输出、异常的约定。比如子类对输入数据的校验比父类更严格，又比如子类能抛出比父类更多类型的异常，这些都违背 LSP。
3. 子类违背父类注释中所罗列的任何特殊说明。

可以拿父类的单元测试去验证子类的代码。如果某些单元测试运行失败，就有可能说明，子类的设计实现没有完全地遵守父类的约定，子类有可能违背了里式替换原则。

## 接口隔离原则（ISP）

Interface Segregation Principle: Clients should not be forced to depend upon interfaces that they do not use.

客户端不应该被强迫依赖它不需要的接口。其中“客户端”可以理解为接口的调用者或者使用者。

关键是理解其中的“接口”二字。这里我们可以把接口理解为下面三种东西：
- 一组 API 接口集合
- 单个 API 接口或函数
- OOP 中的接口概念

### 把“接口”理解为一组 API 接口集合

微服务用户系统提供了一组跟用户相关的 API 给其他系统使用，比如：注册、登录、获取用户信息等。具体代码如下所示：
```
public interface UserService {
  boolean register(String cellphone, String password);
  boolean login(String cellphone, String password);
  UserInfo getUserInfoById(long id);
  UserInfo getUserInfoByCellphone(String cellphone);
}

public class UserServiceImpl implements UserService {
  //...
}
```

现在，我们的后台管理系统要实现删除用户的功能，希望用户系统提供一个删除用户的接口。
在 UserService 中新添加一个接口，可以解决问题，但是也隐藏了一些安全隐患。删除用户是一个非常慎重的操作，如果我们把它放到 UserService 中，那所有使用到 UserService 的用户，都可以调用这个接口，可能导致误删用户。

如果暂时没有接口鉴权的方案来限制接口的调用，我们还是可以从代码的层面，尽量避免接口被误用。根据接口隔离的原则（调用者不应强迫依赖它不需要的接口），将删除接口单独放到另外的一个接口 RestrictedUserService 中，然后将 RestrictedUserService 只打包提供给后台管理系统来使用。具体的代码实现如下所示：
```
public interface UserService {
  boolean register(String cellphone, String password);
  boolean login(String cellphone, String password);
  UserInfo getUserInfoById(long id);
  UserInfo getUserInfoByCellphone(String cellphone);
}

public interface RestrictedUserService {
  boolean deleteUserByCellphone(String cellphone);
  boolean deleteUserById(long id);
}

public class UserServiceImpl implements UserService, RestrictedUserService {
  // ...省略实现代码...
}
```

在设计微服务或者类库接口的时候，如果部分接口只被部分调用者使用，那我们就需要将这部分接口隔离出来，单独给对应的调用者使用，而不是强迫其他调用者也依赖这部分不会被用到的接口。

### 把“接口”理解为单个 API 接口或函数

这里接口隔离原则就可以理解为：函数的设计要功能单一，不要将多个不同的功能逻辑放在一个函数中实现。

这跟单一职责原则有些类似，但稍有区别。单一职责原则针对的是模块、类、接口的设计，而接口隔离原则一方面更侧重接口的设计，另一方面它的思考角度不同——它提供了一种判断接口是否职责单一的标准：通过调用者如何使用接口来间接地判定。**如果调用者只使用部分接口或接口的部分功能，那接口的设计就不够职责单一。**

## 依赖反转原则（DIP）

有时也翻译成“依赖倒置原则”。

Dependency Inversion Principle: High-level modules shouldn’t depend on low-level modules. Both modules should depend on abstractions. In addition, abstractions shouldn’t depend on details. Details depend on abstractions.

大概意思就是：**高层模块不要依赖低层模块。**高层模块和低层模块应该通过抽象来互相依赖。除此之外，**抽象不要依赖具体实现细节**，具体实现细节依赖抽象。

所谓高层模块和低层模块的划分，简单来说，调用者属于高层，被调用者属于低层。在平时的业务代码开发中，高层模块依赖低层模块是没有任何问题的。实际上，这条原则主要还是用来指导**框架层面的设计**。比如 Tomcat 这个 Servlet容器：
> Tomcat 是运行 Java Web 应用程序的容器。我们编写的 Web 应用程序代码只需要部署在 Tomcat 容器下，便可以被 Tomcat 容器调用执行。按照之前的划分原则，Tomcat 就是高层模块，我们编写的 Web 应用程序代码就是低层模块。Tomcat 和应用程序代码之间并没有直接的依赖关系，两者都依赖同一个“抽象”，也就是 Servlet 规范。Servlet 规范不依赖具体的 Tomcat 容器和应用程序的实现细节，而 Tomcat 容器和应用程序依赖 Servlet 规范。

### 容易混的概念

1. 控制反转（Inversion Of Control，缩写为 IOC）。它是一个比较笼统的设计思想，并不是一种具体的实现方法，一般用来指导框架层面的设计。这里所说的“控制”指的是对程序**执行流程**的控制。而“反转”指的是在没有使用框架之前，程序员自己控制整个程序的执行；在使用框架之后，整个程序的执行流程通过框架来控制，流程的控制权从程序员“反转”给了框架。实现控制反转的方式有很多，除了依赖注入，还有模板模式等。
2. 依赖注入（Dependency Injection，缩写为 DI）。它是一种具体的编码技巧，应用起来非常简单。一句话概括就是：不通过 new 的方式在类内部创建依赖类对象，而是将依赖的类对象在外部创建好之后，通过构造函数、函数参数等方式传递（或注入）给类使用。
3. 依赖注入框架（DI Framework）。我们通过依赖注入框架提供的扩展点，简单配置一下所有需要的类及其类与类之间依赖关系，就可以实现由框架来自动创建对象、管理对象的生命周期、依赖注入等原本需要程序员来做的事情。