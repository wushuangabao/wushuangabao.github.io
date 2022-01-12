# 虚幻4蓝图系统架构
```
tags:
  - C/C++
  - 学习
  - UE4
categories:
  - 游戏引擎

date: 2021-04-01 16:01:55
```

本文是对《大象无形：虚幻引擎》第13章《蓝图》的记录。


## 蓝图架构简述

蓝图是虚幻引擎提供的面向对象的可视化编程系统。小型蓝图的编译速度远远快过C++的编译速度，而且UE在发布最终版本的时候会将蓝图编译为C++从而提升其执行效率，因此选择C++的理由可能只剩下C++本身更大范围的API，以及蓝图系统在内容较多时不如C++直观的原因。

蓝图系统是一套依托于UE现有UClass、UProperty、UFunction框架，根植于Unreal Script字节码编译器系统的一套可视化编程系统。蓝图最终编译结果依然会转化为UClass、UProperty、UFunction信息。其中指令代码将会存储于UFunction的信息中。

蓝图系统实际上是由三个部分组成的：
- 蓝图编辑系统
- 蓝图本身
- 蓝图编译后的字节码

最终编译完成的**蓝图字节码**将不会包含**蓝图本身的节点信息**。这部分信息是在`UEdGraph`数据结构中存储的，这也是一种优化。

## 前端：蓝图存储与编辑

`UEdGraph`有三个重要数据：
```
class UEdGraph : public UObject
{
public:
	/** The schema that this graph obeys */
	TSubclassOf<class UEdGraphSchema>  Schema;

	/** Set of all nodes in this graph */
	TArray<class UEdGraphNode*> Nodes;

	/** Child graphs that are a part of this graph; the separation is purely visual */
	TArray<class UEdGraph*> SubGraphs;
```

### Schema

Schema的意思是语法，它规定当前蓝图能够产生什么样的节点等信息。当定义了自己的Schema之后，通过重载对应的函数即可实现语法的规定。常用的重载函数有：
- `GetContextMenuActions`定义当前蓝图编辑器中右键菜单的菜单项。通过向`FGraphContextMenuBuilder`中填充内容可以定制右键菜单。
- Drop系列函数，从外部拖放一个资源对象进入蓝图时触发。包括拖放到蓝图中、节点上和Pin上。

### 编辑器

蓝图的编辑器实质上是一个Slate控件，即`SGraphEditor`。可以这样理解，`UEdGraph`存储蓝图的“数据”资料，`SGraphEditor`通过解析数据生成对应的“显示控件”并处理交互。类似于MVC架构中的View部分。

在`SNew`实例化`SGraphEditor`的时候，传入一个`UEdGraph*`类型的参数`GraphToEdit`，即可指定当前编辑器正在编辑的蓝图。

## 后端：蓝图的编译

> 只有**包含具体逻辑**的蓝图才**需要编译**为蓝图字节码，有一些蓝图仅仅只需要自身数据就可以了。

蓝图`UBlueprint`编译完成产生的结果，应当是一个包含完整信息的`UClass`对象，而不是对应的类的对象。

> UClass继承自UStruct。UStruct只包含成员变量的反射信息，支持高速的构造和析构；而UClass则更加重量级，需要对成员函数进行反射。
> 在UClass中有成员变量`FuncMap`，用于存储当前UClass包含的成员函数信息。同一个类的所有对象共有同样的成员函数，因此成员函数的信息存储于**类数据**中，而非存储在每个对象中。

### 编译过程

一个蓝图会经历以下过程，最终产生出UClass：
1. 类型清空，清空当前类的内容。每个蓝图生成的类，即`UBlueprintGeneratedClass`，都会被复用（并非被删除后创建新的实例）。对应函数为`CleanAndSanitizeClass`。
2. 创建类成员变量。根据蓝图中的`NewVariables`数组与其他位置定义的类成员变量，创建`UProperties`。对应的函数为`CreateClassVariablesFromBlueprint`。
3. 处理事件蓝图。调用`CreateAndProcessUberGraph`函数，将所有的事件蓝图复制到一张超大蓝图里面，此时每个节点都有机会去展开自己（例如宏节点）。同时每个事件蓝图都会创建一个`FKismetFunctionContext`对象与之对应。
4. 处理函数蓝图。普通的函数蓝图通过`ProcessOneFunctionGraph`函数进行处理。此时每个函数蓝图会被复制到一个暂时的蓝图里面，同时节点有机会被展开。同样，每个函数蓝图都会有一个`FKismetFunctionContext`与之对应。
5. 预编译函数。`PrecompileFunction`函数对函数进行预编译。其完成了这样的内容：
	1. “修剪”蓝图，只有连接的节点才会被保留，无用的节点会被删掉；
	2. 运行现在还剩下的节点句柄的`RegisterNets`函数。
	3. 填充函数的骨架，包括参数和局部变量的信息。但是里面还没有脚本代码。
6. 组合和链接类。此时编译器已经获得了当前类的所有属性与函数的信息，可以开始组合和链接类了。包括填充变量链表、填充变量的大小、填充函数表等。这一步本质上产生了一个类的头文件以及一个类默认对象（CDO），但是缺少类的最终标记以及元数据。
7. 编译函数。这一步还没产生实际的虚拟机码。包括以下步骤：
	1. 调用每个节点句柄的Compile函数，从而生成一个`FKismetCompiledStatement`对象。
	2. 调用`AppendStatementForNode`函数。
8. 完成类编译。填充类的标记和元数据，并从父类中继承需要的标记和元数据。进行一系列的最终检测，确保类被正确编译。
9. 后端产生最终代码。后端逐函数地转换节点状态集合为最终代码。如果使用`FKismetCompilerVMBackend`，则产生虚拟机字节码，使用`FKismetCppBackend`则产生C++代码。
10. 复制类默认值对象属性。借助一个特殊函数`CopyPropertiesForUnrelatedObjects`将老的类默认对象的值复制到新的对象中。因为这个转换是通过基于Tag的序列化完成的，因此只要名字没变，值就会被转换过来。而组件则会被重新实例化，并被适当地修复。
11. 重新实例化。由于新的类的大小可能会改变，参数也有可能增减，编译器需要对原来的那个类的所有对象进行重新实例化。首先借助`TObjectInterator`来找到正在编译的类的所有实例，生成一个新的类，然后通过`CopyPropertiesForUnrelatedObjects`将老实例的值更新到新的实例。

在这个过程中涉及的术语如下:
- `FKismetCompilerContext` 完成实际编译工作的类。每次编译都会创建一个新的对象。这个类存储了正在被编译的蓝图和类的引用。
- `FKismetFunctionContext` 包含编译一个单独函数的信息，持有对应蓝图（不一定是函数蓝图）的引用、属性的引用以及生成的UFunction的引用。
- `FNodeHandlingFunctor` 单例类，也是辅助类。用于处理编译过程中的一类节点的类。包含一系列的函数，用于注册连接线以及生成编译后的Statement信息。
- `FKismetCompiledStatement` 一个编译器的独立工作单元。编译器把节点转换为一系列已经编译好的表达式，最终后端会将表达式转换为字节操作码。案例：变量赋值、Goto、Call。
- `FKismetTerm` 蓝图中的一个端子（literal、const或者vaiable的引用）。每个数据链接点都对应一个这个东西。你可以在`NodeHandlingFunctor`中创建你自己的端子，用来捕获变量或者传递结果。

### 多编译器适配

对于每一个对当前蓝图进行编译的请求（通过调用`FKismet2CompilerModule::CompileBlueprint`函数），会询问当前所有的Compiler，调用它们的`CanCompile`函数，询问是否可以编译当前蓝图。

如果某个类实现了`IKismetCompilerInterface`接口，那么就可以通过以下代码来在Kismet编译器中注册Compiler。虚幻引擎自己的系统UMG编辑器就是通过这样的方式注册自己为一个编译器的。
```
IKismetCompilerInterface& KismetCompilerModule = FModuleManager::LoadModuleChecked<IKismetCompilerInterface>("KismetCompiler ");
KismetCompilerModule.GetCompilers().Add(this);
```

### 编译上下文

这里讨论的蓝图主要是我们平时使用的代码蓝图，也就是不讨论状态机、动画蓝图和UMG蓝图。如果发现`KismetCompiler`能够编译当前蓝图，虚幻引擎会创建一个Kismet编译器上下文，即`FKismetCompilerContext`结构。这个结构会负责编译当前的蓝图。
存在多种类型的CompilerContext，持有编译“一段”内容所需要的信息。接下来就会讲解主要上下文之间的关系。

### 整理与归并

下图展示了蓝图编译过程中，从蓝图`UBlueprint`结构到编译上下文`FKismetCompileContext`的主要过程。其中非箭头线表示持有关系，箭头表示步骤。这个过程主要是将蓝图的数据结构进行整理、简化，转化为线性的调用链表，方便接下来逐节点地编译。

![从蓝图到编译上下文](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/TmEUgtj9EK6.7V8ajmQrECqkEOwWylcyCiNISzUoq0CJLFxSY2kY1HLDDqDpB.SlHR8uzOriKlju3wOPPsOAJEt3FTEHvRPuV3*ey2n1glk!/b&bo=agPaAQAAAAADF4A!&rf=viewer_4)

1. 首先把新变量添加到成员变量数组中。
2. 把事件蓝图展开为一个超大的蓝图（`UberGraph`）。这个过程会展开收缩的节点，然后整理为一个一个的函数蓝图。其中一个事件实质上被看做一个单独函数处理。
3. 单个超大蓝图持有多个子函数蓝图，对每一个子函数蓝图分配一个函数编译上下文。
4. 将转换完的函数编译上下文收入到“函数编译上下文列表”（FunctionList）中。
5. 从函数到具体节点：得到一个“线性执行表”。这个表里面存在着一个个以`UEdGraphNode`表示的节点。
6. 这些节点会被编译系统转化为合适的编译信息。在编译每个节点时，寻找对应的`NodeHandler`来完成编译。

### 节点处理

自此，编译过程开始进入逐节点的处理阶段。比较主要的节点句柄包括：
- FKCHandler_CallFunction 处理函数调用节点。
- FKCHandler_EventEntry 处理事件入口节点。
- FKCHandler_MathExpression 处理数学表达式。
- FKCHandler_Passthru 处理返回值节点。
- FKCHandler_VariableSet 处理变量设置值节点。

当你展开所有节点之后，蓝图的主要节点都可以被归并到这些节点中去。
对于每个节点，虚幻引擎都会通过`AppendStatementForNode`给其挂上`FBlueprintCompiledStatement`，如下图所示。

![从编译上下文到脚本字节码](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/TmEUgtj9EK6.7V8ajmQrEOjm*j9UD58dDKAqGFHN2GrMMwjKloRAs8jsBdJAKIYaoj6uPopruAIHFb3*8YN*tBaDZCQMGLiiD44GmXf.o68!/b&bo=agPSAQAAAAADF4g!&rf=viewer_4)

> 实际上，`FBlueprintCompiledStatement`结构是一个“头”+“信息”的结构。如果你曾经学过汇编语言或者机器指令，那么你可以理解为：一个Statement就像是一个定长指令，包含开头的一个操作码与后面的操作参数。指令本身定长（即 `FBlueprintCompiledStatement`结构大小固定），但操作码不同，填充不同字段。

> `FBlueprintCompiledStatement`存储的一个重要信息是类型枚举`EKismetCompiledStatementType`，这个枚举指示了数十种操作，包括`KCST_CallFunction`（对应C++代码的`TargetObject->FunctionToCall(wiring)`）、`KCST_Assignment`对应C++代码的`TargetObject->TargetProperty = [wiring]`）等。

逐节点地创建了Statement之后，开始最终的后端编译。如果是使用UnrealScript的脚本字节码虚拟机，此时会调用`FScriptBuilderBase`的`GenerateCodeForStatement`函数，对每个Statement生成对应的字节码。

#### 对象指针的存储

蓝图字节码在编译时，如果遇到对象指针，会直接存储指针值本身。
这就涉及一个很严重的问题：序列化结束后，对象在内存中的位置会发生改变，原有的存储于字节码中的指针值会失效。

虚幻引擎采用的方案是在存储之前再次遍历字节码数组，依次取出字节码过滤，遇到对象指针值时，替换为`ImportTable`或者`ExportTable`中的索引值。在反序列化时同样会重新遍历，并修正指针的值。

### 后话：VM虚拟机调用

> 经过编译生成的Script字节码最终是如何被实际调用的呢？

编译完成的Script会被放在`UFunction`对应的Script数组中。同时当前UFunction的`FUNC_Native`标记不会被设置。因此在UFunction的Bind阶段（也就是将UFunction与所属类对接的时候），将会设置自身的Func指针指向`UObject`类的`ProcessInternal`函数，而非当前UFunction所属的`UClass`类中的C++函数表`NativeFunctionLookupTable`中对应的函数，如下图所示。

![UFunction和UClass的关系示意图](http://m.qpic.cn/psc?/V11Tp57c2B9kPO/TmEUgtj9EK6.7V8ajmQrECd8h2XWFeUIS3Fhe8ifEMMCi67toOpNAxTbZqvtbRxDTy.4Ay4ld1Eu1VEN7HRMqPrLRwyRhRisxgjWxXd4jy4!/b&bo=ZgOqAQAAAAADF*w!&rf=viewer_4)

在调用`UFunction::Invoke`函数时，`UObject:ProcessInternal`函数会被“当作”一个成员函数调用，去执行当前UFunction包含的脚本字节码。

有一个`GNatives`数组，里面是和VM操作码对应的执行函数。以操作码为数组下标，取出来就是一个对应的执行函数，直接填充参数然后执行即可获取执行结果。这给人的感觉更像是一种解释器，而非一个最终编译为汇编机器码的执行前编译虚拟机。

### 小结

虚幻引擎的逻辑蓝图是一个涉及颇多方面的系统。从非常适合编辑的`UEdGraph`结构开始，逐步归并整理，以产生`UClass`结构。然后对逻辑相关的部分进行处理之后，不断向适合顺序执行结构靠拢，最终被Backend发射成为最终的字节码。

其实从实用主义的角度而言，知道如何向蓝图暴露函数、蓝图如何调用C++层的函数就已经能够使用蓝图完成大部分的开发工作了。如果有需要，希望用C++调用蓝图函数的知识也并不复杂。
那么为何非要了解蓝图的编译和工作方式呢？那是因为笔者希望读者能拥有扩展虚幻引擎本身的能力，针对项目的需求，扩展蓝图自身的节点，甚至**创造自己的蓝图系统**以应对特殊的需求（比如剧情分支树等）。
另外，笔者也希望读者拥有对虚幻引擎自身工作机制的好奇心，以及对虚幻引擎本身进行研究的勇气。虚幻引擎的源码就在你的眼前，去了解它吧！

## 蓝图虚拟机

虚幻引擎内置的、用于执行蓝图编译后的字节码的虚拟机继承自UE3时代的Unreal Script虚拟机。
这是一套基于字节码和栈的虚拟机，同时具有自身的优化、妥协与设计，让本身就复杂的系统更加复杂。

### 虚幻引擎的实现

|真实虚拟机|虚幻引擎|
|-|-|
|执行系统|FFrame|
|编译器|FKismetCompilerContext等多个类|
|字节码数组|Ustruct::Script|
|字节码解释表|GNatives数组|
|字节码执行函数|注册到GNatives中的函数|
|暂存栈|无完全一致对应|

`FFrame`最重要的成员函数，是一系列获取字节码并执行的Step函数，和一系列从字节码中读取数据的Read函数。

### C++函数注册到蓝图

当使用`UFUNCTION`宏定义了一个可以被虚拟机调用的函数时，UHT会自动帮助你生成一个看上去像这样的函数：
```
#define DECLARE_FUNCTION(func) void func( FFrame& Stack, RESULT_DECL )

DECLARE_FUNCTION(exec[你的函数名])
{
	P_GET_TARRAY_REF(USceneComponent*, Z_Param_Out_AllComponet); //获取参数
	P_FINISH;
	P_NATIVE_BEGIN;
	this->GetAllSubCustomComponet(Z_Param_Out_AllComponet); //实际调用区域
	P_NATIVE_END;
}
```

在.generated.cpp中，这个函数会借助`FNativeFunctionRegistrar::RegisterFunction`函数，被注册到当前UClass类的`NativeFunction`列表中，并增加UFunction信息到UClass。

假如一个蓝图需要调用一个C++函数，编译器会设置字节码`EX_FinalFunction`，并将对应的UFunction指针同时放入到下一个字节码中，执行时就会调用：
```
CallFunction( Stack, RESULT_PARAM, (UFunction*)Stack.ReadObject() );
```

从而将对应的exec函数所属的UFunction对象取出，`CallFunction`函数在检查到这是一个原生函数时，会直接调用`UFunction::Invoke`函数。在Invoke函数内部会调用当前UFunction函数的Func函数指针:
```
return (Obj->*Func)(Stack, RESULT_PARAM);
```

这个函数就是上文中，UHT通过`DECLARE_FUNCTION`宏帮我们生成的exec函数。

简而言之，C++函数封装过程可以这样理解：
1. C++函数被UHT识别，生成包裹函数exec<函数名>。
2. exec<函数名>被`FNativeFunctionRegistrar`在运行前注册到UClass的函数列表中，创建UFunction信息。
3. 蓝图编译器在发现函数调用节点时，生成调用State，发现是原生函数，生成`EX_FinalFunction`字节码，并将对应的UFunction指针压栈。
4. 蓝图执行系统发现`EX_FinalFunction`字节码，于是读取下一段字节，解释为`UFunction*`。
5. 通过`UFunction*`的`Invoke`函数，调用exec<函数名>包裹函数。
6. 包裹函数拆包并准备参数列表，调用C++函数。