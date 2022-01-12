# 【设计模式】迭代器模式

```
tags:
  - 学习
  - 设计模式
originContent: ''
categories:
  - 编程艺术

date: 2020-07-03 17:20:55
```

摘要：介绍迭代器模式的原理与实现，以及迭代时增删元素引发不可预期问题的解决方案。


## 原理与实现

迭代器模式（Iterator Design Pattern），也叫作游标模式（Cursor Design Pattern），用来**遍历集合对象**。不过，很多编程语言都将迭代器作为一个基础的类库，直接提供出来了。在平时开发中，特别是业务开发，我们直接使用即可，很少会自己去实现一个迭代器。

“集合对象”也可以叫“容器”、“聚合对象”，实际上就是包含一组对象的对象，比如数组、链表、树、图、跳表。迭代器模式将集合对象的遍历操作从集合类中拆分出来，放到迭代器类中，让两者的职责更加单一。

![迭代器类图](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/j5BRZUlgKbUG5yYXn162*dGfZNglzIzc12LwGY7HqzPB1*Eh8DruS62oXwm1nsYDjUnpYyd6p*3B3yKoJDVgkg!!/b&bo=EwL5AAAAAAADB8o!&rf=viewer_4)

举个例子，针对 ArrayList 和 LinkedList 两个线性容器，设计实现对应的迭代器：

```
// 接口定义
public interface Iterator<E> {
  boolean hasNext();
  void next();
  E currentItem();
}

// 接口实现
public class ArrayIterator<E> implements Iterator<E> {
  private int cursor;
  private ArrayList<E> arrayList;

  public ArrayIterator(ArrayList<E> arrayList) {
    this.cursor = 0;
    this.arrayList = arrayList;
  }

  @Override
  public boolean hasNext() {
    return cursor != arrayList.size(); //注意这里，cursor在指向最后一个元素的时候，hasNext()仍旧返回true。
  }

  @Override
  public void next() {
    cursor++;
  }

  @Override
  public E currentItem() {
    if (cursor >= arrayList.size()) {
      throw new NoSuchElementException();
    }
    return arrayList.get(cursor);
  }
}

public class Demo {
  public static void main(String[] args) {
    ArrayList<String> names = new ArrayList<>();
    names.add("xzg");
    names.add("wang");
    names.add("zheng");
    
    Iterator<String> iterator = new ArrayIterator(names);
    while (iterator.hasNext()) {
      System.out.println(iterator.currentItem());
      iterator.next();
    }
  }
}
```

在上面的代码实现中，我们需要将待遍历的容器对象，通过构造函数传递给迭代器类。
实际上，为了封装迭代器的创建细节，我们可以在容器中定义一个 iterator() 方法，来创建对应的迭代器。为了能实现基于接口而非实现编程，我们还需要将这个方法定义在 List 接口中：

```
public interface List<E> {
  Iterator iterator();
  //...省略其他接口函数...
}

public class ArrayList<E> implements List<E> {
  //...
  public Iterator iterator() {
    return new ArrayIterator(this);
  }
  //...省略其他代码
}

public class Demo {
  public static void main(String[] args) {
    List<String> names = new ArrayList<>();
    names.add("xzg");
    names.add("wang");
    names.add("zheng");
    
    Iterator<String> iterator = names.iterator();
    while (iterator.hasNext()) {
      System.out.println(iterator.currentItem());
      iterator.next();
    }
  }
}
```

对于 LinkedIterator，它的代码结构跟 ArrayIterator 完全相同。总结为三句话：
- 迭代器中需要定义 hasNext()、currentItem()、next() 三个最基本的方法。
- 待遍历的容器对象通过依赖注入传递到迭代器类中。
- 容器通过 iterator() 方法来创建迭代器。

![细化后的迭代器类图](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/S1G4*2hi*D5aPIJug2nMawOEvunedLWDB8l0DPc63qldnHsAP6UVlIsONA521.QBqC8maNuavSuIzQ4UPDuLCQmzNP0bnECyO4uEH73AbcM!/b&bo=GQIvAQAAAAADFwc!&rf=viewer_4)

## 迭代器模式的优势

一般来讲，遍历集合数据有三种方法：for 循环、foreach 循环、iterator 迭代器。其中 foreach 循环的底层也是基于迭代器来实现的。

相对于 for 循环遍历，利用迭代器来遍历有下面三个优势：
- 迭代器模式封装集合内部的复杂数据结构，开发者不需要了解如何遍历，直接使用容器提供的迭代器即可；
- 迭代器模式将集合对象的遍历操作从集合类中拆分出来，放到迭代器类中，让两者的职责更加单一；
- 迭代器模式让添加新的遍历算法更加容易，更符合开闭原则。除此之外，因为迭代器都实现自相同的接口，在开发中，基于接口而非实现编程，替换迭代器也变得更加容易。

## 遍历的同时，增删集合元素

在通过迭代器来遍历集合元素的同时，增加或者删除集合中的元素，有可能会导致某个元素被重复遍历或遍历不到。不过，并不是所有情况下都会遍历出错，所以，这种行为称为结果**不可预期行为**，也就是说，运行结果到底是对还是错，要视情况而定。

“不可预期”比直接出错更加可怕，一些隐藏很深、很难 debug 的 bug 就是这么产生的。有两种比较干脆利索的解决方案：一种是遍历的时候不允许增删元素，另一种是增删元素之后让遍历报错。第一种解决方案比较难实现，因为很难确定迭代器使用结束的时间点。第二种解决方案更加合理，Java 语言就是采用的这种解决方案。

### 实现支持“快照”功能的迭代器

所谓“快照”，指我们为容器创建迭代器的时候，相当于给容器拍了一张快照（Snapshot）。之后即便我们增删容器中的元素，快照中的元素并不会做相应的改动。这样就避免了在使用迭代器遍历的过程中，增删容器中的元素，导致的不可预期的结果或者报错。

#### 方案一

在迭代器类中定义一个成员变量 snapshot 来存储快照。每当创建迭代器的时候，都拷贝一份容器中的元素到快照中，后续的遍历操作都基于这个迭代器自己持有的快照来进行。

这个解决方案虽然简单，但代价也有点高。每次创建迭代器的时候，都要拷贝一份数据到快照中，会增加内存的消耗。如果一个容器同时有多个迭代器在遍历元素，就会导致数据在内存中重复存储多份。

#### 方案二

在容器中，为每个元素保存两个时间戳，一个是添加时间戳 addTimestamp，一个是删除时间戳 delTimestamp。当元素被加入到集合中的时候，我们将 addTimestamp 设置为当前时间，将 delTimestamp 设置成最大长整型值（Long.MAX_VALUE）。当元素被删除时，我们将 delTimestamp 更新为当前时间，表示已经被删除（只是标记删除，并非真正删除）。

同时，每个迭代器也保存一个迭代器创建时间戳 snapshotTimestamp，也就是迭代器对应的快照的创建时间戳。当使用迭代器来遍历容器的时候，只有满足 addTimestamp<snapshotTimestamp<delTimestamp 的元素，才是属于这个迭代器的快照。

这样就在不拷贝容器的情况下，在容器本身上借助时间戳实现了快照功能。