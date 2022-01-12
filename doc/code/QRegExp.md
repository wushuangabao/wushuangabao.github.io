# 【Qt】QRegExp Class 文档翻译

```
tags:
  - 学习
  - Qt
categories:
  - 编程艺术

date: 2019-07-17 11:38:55
```

The QRegExp class **provides pattern matching** using regular expressions.

regular expression = regexp = 正则表达式，是一种用来匹配 substring 的 pattern 。


## 特性

正则表达式的用途：
- Validation. 测试 substring 是否符合一些标准，例如一个不含 whitespace 的整数；
- Searching. 
- Search and Replace.
- String Splitting. 标识（identify）字符串的拆分位置，例如拆分以制表符分隔的字符串。

QRegExp 模仿 [Perl 的正则表达式](https://www.runoob.com/perl/perl-regular-expressions.html)。它完全支持 Unicode 编码。

QRegExp 也可以使用更简单的**通配符模式（wildcard mode）**，类似 command shells 的功能。

QRegExp 使用的**语法规则 syntax rules** 可以使用 `setPatternSyntax()` 改变。

In particular, the **pattern syntax** can be set to `QRegExp::FixedString`, which means the pattern to be matched **is interpreted as a plain string** 被解释为“纯”字符串, i.e. 即, special characters (e.g. 例如, backslash 反斜线) are not escaped 转义.

图书推荐：《Mastering Regular Expressions (第三版)》Jeffrey E. F. Friedl, ISBN 0-596-52812-4

注意：Qt5 中新的 QRegularExpression 类提供了兼容 Perl （Perl compatible）的正则表达式实现，来代替 QRegExp 类。

工具：正则表达式[在线测试](https://c.runoob.com/front-end/854)

## 介绍

### 基本组成

Regexps are built up from:
- expressions 表达式
- quantifiers 量词
- assertions 断言

#### expression

The simplest **expression** is a character, e.g. x or 5. An expression can also be a set of characters enclosed in square brackets.
一个表达式可以是包含在方括号中的一揽子字符。
`[ABCD]` will match an A or a B or a C or a D. We can write this same expression as `[A-D]`, and an expression to match any capital letter in the English alphabet is written as `[A-Z]`.

### quantifier

A **quantifier** specifies the number of occurrences of an expression that must be matched.
量词指定了一个表达式必须匹配的出现次数。
`x{1,1}` means match one and only one x.
`x{1,5}` means match a sequence of x characters that contains at least one x but no more than five.

Note that in general regexps cannot be used to check for balanced brackets or tags.
注意，通常的正则表达式无法用来检查括号或标签是否配对。
如果 html 的 <b> 标签有**嵌套（be nested）**，同样的正则表达式就会匹配错误。
只有当嵌套的层数固定且已知时，才可以写出正确的正则。

### assertion

假设我们想要一个匹配 0 到 99 的整数的正则表达式，我们写出 `[0-9]{1,2}` 来满足需求，但是它也会匹配一个包含整数的字符串。
If we want the matched integer to be the whole string, we must use the **anchor assertions**, ^ (caret) and $ (dollar).
如果我们只想让整个字符串是整数，我们必须使用**锚定断言**，正则表达式变成了 `^[0-9]{1,2}$` 。

^ and $, do not match characters but locations in the string:
- When ^ is the first character in a regexp, it means the regexp must match from the beginning of the string.
- When $ is the last character of the regexp, it means the regexp must match to the end of the string.

### 特殊符号

If you have seen regexps described elsewhere, they may have looked different from the ones shown here. This is because some sets of characters and some quantifiers are so common that they have been given special symbols to represent them.
其他地方的正则表达式可能看起来和这里展示的不同。这是因为一些字符和量词可以表示为特殊符号。

- `[0-9]` can be replaced with the symbol `\d`.
- The quantifier to match exactly one occurrence, {1,1}, can be replaced with the expression itself, i.e. `x{1,1}` is the same as `x`.
- `？` 是量词 `{0,1}` 的简写，即出现 0 或 1 次。? makes an expression optional.
- the vertical bar `|` 表示 or.

So our 0 to 99 matcher could be written as `^\d{1,2}$`. It can also be written `^\d\d{0,1}$`, i.e. In practice 实践中, it would be written as `^\d\d?$`.

#### 举个例子

To write a regexp that matches one of the words 'mail' or 'letter' or 'correspondence', start with a regexp that matches 'mail'.
Expressed fully, the regexp is `m{1,1}a{1,1}i{1,1}l{1,1}`, but because a character expression is automatically quantified by {1,1}, we can simplify the regexp to `mail`, i.e., an 'm' followed by an 'a' followed by an 'i' followed by an 'l'. To include the other two words, our regexp becomes `mail|letter|correspondence`.

While this regexp will match one of the three words we want to match, it will also match words we don't want to match, e.g., 'email'. To **prevent the regexp from matching unwanted words, we must tell it to begin and end the match at word boundaries.** 

首先我们 enclose 我们的 regexp in parentheses, `(mail|letter|correspondence)`. 圆括号 parentheses 将表达式 group together，并且在 regexp 中 indentify 我们希望 capture 的部分，我们可以将它作为 component 应用到更多复杂的 regexp 中。我们还可以用圆括号检查实际匹配到了 3 个单词中的哪一个。

To force the match to begin and end on word boundaries, we enclose the regexp in \b **word boundary assertions**: `\b(mail|letter|correspondence)\b`.
Now the regexp means: Match a word boundary, followed by the regexp in parentheses, followed by a word boundary. 

word boundary 断言 \b 用于匹配 regexp 中的位置，而非字符。一个 word boundary 是任意的 non-word 字符，例如 space, newline, or the beginning or ending of a string.

#### 再举一例

If we want to replace **ampersand characters** (&字符) with the HTML entity `&amp;`, the regexp to match is simply `&`. But this regexp will also match ampersands that have already been converted to HTML entities. We want to replace only ampersands that are not already followed by `amp;`. For this, we need the **negative lookahead assertion**, `(?!__)`. The regexp can then be written as `&(?!amp;)`, i.e.


## 字符集及其缩写

Characters and Abbreviations for **Sets of Characters** (字符集)

下表我只摘了一些常用的。

| Element | Meaning |
| --- | --- |
| c | A character represents itself unless it has a special regexp meaning. e.g. c matches the character c. |
| \c | A character that follows a backslash matches the character itself, except as specified below. e.g., To match a literal caret at the beginning of a string, write \^. |
| \n | Matches the ASCII line feed (LF, 0x0A, Unix newline). |
| \r | Matches the ASCII carriage return (CR, 0x0D). |
| \t | Matches the ASCII horizontal tab (HT, 0x09). |
| \v | Matches the ASCII vertical tab (VT, 0x0B). |
| . (dot) | Matches any character (including newline). |
| \d | Matches a digit (QChar::isDigit()). |
| \D | Matches a non-digit. |
| \s | Matches a whitespace character (QChar::isSpace()). |
| \S | Matches a non-whitespace character. |
| \w | Matches a word character (QChar::isLetterOrNumber(), QChar::isMark(), 或下划线) |
| \W | Matches a non-word character. |
| \n | The n-th backreference, e.g. \1, \2, etc. 第n个[反向引用](https://www.runoob.com/regexp/regexp-syntax.html) |

**Note:** The C++ compiler transforms backslashes in strings. To include a `\` in a regexp, enter it twice, i.e. `\\`. To match the backslash character itself, enter it four times, i.e. `\\\\`.

疑惑：什么是 newline？

## 未完待续