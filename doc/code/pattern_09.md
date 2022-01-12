# 【设计模式】建造者模式

```
tags:
  - 学习
  - 设计模式
categories:
  - 编程艺术

date: 2020-06-05 12:04:52
```

Builder 模式，中文翻译为建造者模式或者构建者模式，也有人叫它生成器模式。

- 直接使用构造函数或配合 set 方法就能创建对象，为什么还需要建造者模式来创建？
- 建造者模式和工厂模式都可以创建对象，它们两个的区别在哪？


## 为什么需要建造者模式？

假设有这样一道设计面试题：
> 我们需要定义一个资源池配置类 ResourcePoolConfig。在这个资源池配置类中，有以下几个成员变量（即可配置项）。请你编写代码实现这个 ResourcePoolConfig 类。

| 成员变量 | 解释 | 是否必填？ | 默认值 |
|-|-|-|-|
| name | 资源名称 | 是 | 没有 |
| maxTotal | 最大总资源数量 | 否 | 8 |
| maxIdle | 最大空闲资源数量 | 否 | 8 |
| minIdle | 最小空闲资源数量 | 否 | 8 |

最常见、最容易想到的实现思路：
```
public class ResourcePoolConfig {
  private static final int DEFAULT_MAX_TOTAL = 8;
  private static final int DEFAULT_MAX_IDLE = 8;
  private static final int DEFAULT_MIN_IDLE = 0;

  private String name;
  private int maxTotal = DEFAULT_MAX_TOTAL;
  private int maxIdle = DEFAULT_MAX_IDLE;
  private int minIdle = DEFAULT_MIN_IDLE;

  public ResourcePoolConfig(String name, Integer maxTotal, Integer maxIdle, Integer minIdle) {
    if (StringUtils.isBlank(name)) {
      throw new IllegalArgumentException("name should not be empty.");
    }
    this.name = name;

    if (maxTotal != null) {
      if (maxTotal <= 0) {
        throw new IllegalArgumentException("maxTotal should be positive.");
      }
      this.maxTotal = maxTotal;
    }

    if (maxIdle != null) {
      if (maxIdle < 0) {
        throw new IllegalArgumentException("maxIdle should not be negative.");
      }
      this.maxIdle = maxIdle;
    }

    if (minIdle != null) {
      if (minIdle < 0) {
        throw new IllegalArgumentException("minIdle should not be negative.");
      }
      this.minIdle = minIdle;
    }
  }
  //...省略getter方法...
}
```

现在，ResourcePoolConfig 只有 4 个可配置项，对应到构造函数中，也只有 4 个参数，参数的个数不多。
但是，如果可配置项逐渐增多，变成了 8 个、10 个，甚至更多，那继续沿用现在的设计思路，**构造函数的参数列表会变得很长**，代码在可读性和易用性上都会变差。在使用构造函数的时候，我们就容易搞错各参数的顺序，传递进错误的参数值，导致非常隐蔽的 bug。

### 使用 set 方法的局限性

解决方法是**用`set()`函数来给成员变量赋值，以减短构造函数的长度**。其中，配置项 name 是必填的，所以我们把它放到构造函数中设置，强制创建类对象的时候就要填写。其他配置项都不是必填的，所以我们通过`set()`来设置，让使用者自主选择填写或者不填写。

但是如果我们把问题的难度再加大点，比如，还需要**解决下面这三个问题**，那上面的设计思路就不能满足了。
- 如果必填的配置项有很多，把这些必填配置项都放到构造函数中设置，那构造函数就又会出现参数列表很长的问题。如果我们把必填项也通过 set 方法设置，那校验这些必填项是否已经填写的逻辑就无处安放了。
- 除此之外，假设配置项之间有一定的依赖关系，比如，如果用户设置了 maxTotal、maxIdle、minIdle 其中一个，就必须显式地设置另外两个；或者配置项之间有一定的约束条件，比如，maxIdle 和 minIdle 要小于等于 maxTotal。这些配置项之间的依赖关系或者约束条件的校验逻辑无处安放。
- 如果我们希望 ResourcePoolConfig 类对象是不可变对象，也就是说，对象在创建好之后，就不能再修改内部的属性值。要实现这个功能，我们就不能在 ResourcePoolConfig 类中暴露 set 方法。

### 建造者模式登场

为了解决这些问题，建造者模式就派上用场了。我们可以把校验逻辑放置到 Builder 类中，先创建 Builder，并且通过 set 方法设置建造者的变量值，然后在使用`build()`方法真正创建对象之前，做集中的校验，校验通过之后才会创建对象。除此之外，我们把 ResourcePoolConfig 的构造函数改为 private 私有权限。这样我们就只能通过建造者来创建 ResourcePoolConfig 类对象。并且，ResourcePoolConfig 没有提供任何 set 方法，这样我们创建出来的对象就是不可变对象了。
用建造者模式重新实现上面的需求，代码如下：
```
public class ResourcePoolConfig {
  private String name;
  private int maxTotal;
  private int maxIdle;
  private int minIdle;

  private ResourcePoolConfig(Builder builder) {
    this.name = builder.name;
    this.maxTotal = builder.maxTotal;
    this.maxIdle = builder.maxIdle;
    this.minIdle = builder.minIdle;
  }
  //...省略getter方法...

  //我们将Builder类设计成了ResourcePoolConfig的内部类，
  //也可以将Builder类设计成独立的非内部类ResourcePoolConfigBuilder。
  public static class Builder {
    private static final int DEFAULT_MAX_TOTAL = 8;
    private static final int DEFAULT_MAX_IDLE = 8;
    private static final int DEFAULT_MIN_IDLE = 0;

    private String name;
    private int maxTotal = DEFAULT_MAX_TOTAL;
    private int maxIdle = DEFAULT_MAX_IDLE;
    private int minIdle = DEFAULT_MIN_IDLE;

    public ResourcePoolConfig build() {
      // 校验逻辑放到这里来做，包括必填项校验、依赖关系校验、约束条件校验等
      if (StringUtils.isBlank(name)) {
        throw new IllegalArgumentException("...");
      }
      if (maxIdle > maxTotal) {
        throw new IllegalArgumentException("...");
      }
      if (minIdle > maxTotal || minIdle > maxIdle) {
        throw new IllegalArgumentException("...");
      }

      return new ResourcePoolConfig(this);
    }

    public Builder setName(String name) {
      if (StringUtils.isBlank(name)) {
        throw new IllegalArgumentException("...");
      }
      this.name = name;
      return this;
    }

    public Builder setMaxTotal(int maxTotal) {
      if (maxTotal <= 0) {
        throw new IllegalArgumentException("...");
      }
      this.maxTotal = maxTotal;
      return this;
    }

    public Builder setMaxIdle(int maxIdle) {
      if (maxIdle < 0) {
        throw new IllegalArgumentException("...");
      }
      this.maxIdle = maxIdle;
      return this;
    }

    public Builder setMinIdle(int minIdle) {
      if (minIdle < 0) {
        throw new IllegalArgumentException("...");
      }
      this.minIdle = minIdle;
      return this;
    }
  }
}

// 这段代码会抛出IllegalArgumentException，因为minIdle>maxIdle
ResourcePoolConfig config = new ResourcePoolConfig.Builder()
        .setName("dbconnectionpool")
        .setMaxTotal(16)
        .setMaxIdle(10)
        .setMinIdle(12)
        .build();
```

使用建造者模式创建对象，还能避免对象存在无效状态（因为一次性初始化好了所有成员变量）。

### 两种构建方法的取舍

实际上，如果我们并不是很关心对象是否有短暂的无效状态，也不是太在意对象是否是可变的，那我们直接暴露`set()`方法来设置类的成员变量值是完全没问题的。

而且，使用建造者模式来构建对象，代码实际上是有点重复的，ResourcePoolConfig 类中的成员变量，要在 Builder 类中重新再定义一遍。

对建造者模式，要注意避免过度使用。

## 与工厂模式有何区别？

建造者模式是让建造者类来负责对象的创建工作。上一节课中讲到的工厂模式，是由工厂类来负责对象创建的工作。那它们之间有什么区别呢？

实际上，工厂模式是用来创建**不同但是相关类型的对象**（继承同一父类或者接口的一组子类），由给定的参数来决定创建哪种类型的对象。建造者模式是用来创建**一种类型的复杂对象**，通过设置不同的可选参数，“定制化”地创建不同的对象。

> 顾客走进一家餐馆点餐，我们利用工厂模式，根据用户不同的选择，来制作不同的食物，比如披萨、汉堡、沙拉。
> 对于披萨来说，用户又有各种配料可以定制，比如奶酪、西红柿、起司，我们通过建造者模式根据用户选择的不同配料来制作披萨。

实际上，我们也不要太学院派，非得把工厂模式、建造者模式分得那么清楚，我们需要知道的是，每个模式为什么这么设计，能解决什么问题。**只有了解了这些最本质的东西，我们才能灵活应用，甚至可以混用各种模式创造出新的模式，来解决特定场景的问题。**