/*
 * @Author: your name
 * @Date: 2021-08-23 16:47:12
 * @LastEditTime: 2021-08-23 16:48:12
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /lens-ts/mian.ts
 */

type Test1 = ['names', number, 'firstName', 'lastName'];
// 假设需要处理的 Tuple 元素类型只会是字符串或 number
// 做这个假设的原因是，对象 object 的 key 一般来说，只会是 string 或 number
type JoinTupleToTemplateStringType<T> = T extends [infer Single] // 此处是递归基，用于判断 T 是否已经是最简单的只有一个元素的 Tuple
  ? Single extends string | number // 如果是递归基，则提取出 Single 的具体类型
  ? `${Single}`
  : never
  // 如果还未到递归基，则继续递归
  : T extends [infer First, ...infer RestTuple] // 完全类似 JS 数组解构
  ? First extends string | number
  ? `${First}.${JoinTupleToTemplateStringType<RestTuple>}` // 递归操作
  : never
  : never;
type TestJoinTupleToTemplateStringType = JoinTupleToTemplateStringType<Test1>;


type Test2 = `names.${number}.firstName.lastName.${number}`;
type SplitTemplateStringTypeToTuple<T> =
  T extends `${infer First}.${infer Rest}`
  // 此分支表示需要继续递归
  ? First extends `${number}`
  ? [number, ...SplitTemplateStringTypeToTuple<Rest>] // 完全类似 JS 数组构造
  : [First, ...SplitTemplateStringTypeToTuple<Rest>]
  // 此分支表示抵达递归基，递归基不是 nubmer 就是 string
  : T extends `${number}`
  ? [number]
  : [T];
type TestSplitTemplateStringTypeToTuple = SplitTemplateStringTypeToTuple<Test2>;


//
// 支持的环境：TS 4.3+
//

/** 获取嵌套对象的全部子路径 */
type AllPathsOf<NestedObj> = object extends NestedObj
  ? never
  // 先把全部子路径组织成 tuple union，再把每一个 tuple 展平为 Template Literal Type
  : FlattenPathTuples<RecursivelyTuplePaths<NestedObj>>;

/** 给定子路径和嵌套对象，获取子路径对应的 value 类型 */
export type ValueMatchingPath<NestedObj, Path extends AllPathsOf<NestedObj>> =
  string extends Path
  ? any
  : object extends NestedObj
  ? any
  : NestedObj extends readonly (infer SingleValue)[] // Array 情况
  ? Path extends `${string}.${infer NextPath}`
  ? NextPath extends AllPathsOf<NestedObj[number]> // Path 有嵌套情况，继续递归
  ? ValueMatchingPath<NestedObj[number], NextPath>
  : never
  : SingleValue // Path 无嵌套情况，数组的 item 类型就是目标结果
  : Path extends keyof NestedObj // Record 情况
  ? NestedObj[Path] // Path 是 Record 的 key 之一，则可直接返回目标结果
  : Path extends `${infer Key}.${infer NextPath}` // 否则继续递归
  ? Key extends keyof NestedObj
  ? NextPath extends AllPathsOf<NestedObj[Key]> // 通过两层判断进入递归
  ? ValueMatchingPath<NestedObj[Key], NextPath>
  : never
  : never
  : never;

/**
* Recursively convert objects to tuples, like
* `{ name: { first: string } }` -> `['name'] | ['name', 'first']`
*/
type RecursivelyTuplePaths<NestedObj> = NestedObj extends (infer ItemValue)[] // Array 情况
  // Array 情况需要返回一个 number，然后继续递归
  ? [number] | [number, ...RecursivelyTuplePaths<ItemValue>] // 完全类似 JS 数组构造方法
  : NestedObj extends Record<string, any> // Record 情况
  ?
  // record 情况需要返回 record 最外层的 key，然后继续递归
  | [keyof NestedObj]
  | {
    [Key in keyof NestedObj]: [Key, ...RecursivelyTuplePaths<NestedObj[Key]>];
  }[Extract<keyof NestedObj, string>]
  // 此处稍微有些复杂，但做的事其实就是构造一个对象，value 是我们想要的 tuple
  // 最后再将 value 提取出来
  // 既不是数组又不是 record 时，表示遇到了基本类型，递归结束，返回空 tuple。
  : [];

/**
* Flatten tuples created by RecursivelyTupleKeys into a union of paths, like:
* `['name'] | ['name', 'first' ] -> 'name' | 'name.first'`
*/
type FlattenPathTuples<PathTuple extends unknown[]> = PathTuple extends []
  ? never
  : PathTuple extends [infer SinglePath] // 注意，[string] 是 Tuple
  ? SinglePath extends string | number // 通过条件判断提取 Path 类型
  ? `${SinglePath}`
  : never
  : PathTuple extends [infer PrefixPath, ...infer RestTuple] // 是不是和数组解构的语法很像？
  ? PrefixPath extends string | number // 通过条件判断继续递归
  ? `${PrefixPath}.${FlattenPathTuples<Extract<RestTuple, (string | number)[]>>}`
  : never
  : string;

/**
* 借助 TS 4.3 的新能力(template string type 增强)改造 FormApi interface 中的 change 方法，可用性几乎完美
* */
interface FormApi<FormValues = Record<string, any>> {
  change: <Path extends AllPathsOf<FormValues>>(
    name: Path,
    value?: Partial<ValueMatchingPath<FormValues, Path>>
  ) => void;
}

// 演示用的嵌套 Form 类型
interface NestedForm {
  name: ['赵' | '钱' | '孙' | '李', string];
  age: number;
  articles: {
    title: string;
    sections: string[];
    date: number;
    likes: {
      name: [string, string];
      age: number;
    }[];
  }[];
}

// 假装有了一个 NestedForm 类型表单实例的 change 方法
const change: FormApi<NestedForm>['change'] = (name, value) => {
  console.log(name, value);
};

//   尽情尝试
let index = 0;
change(`articles.0.likes.${index}.age`, 10);
change(`name.${index}`, '刘'); // 其实此处依然不够安全，可以想想怎么更安全  
r /> /** 提取出来的全部子路径，放在这里直观展示一下 */
  type AllPathsOfNestedForm =
  | keyof NestedForm
  | `name.${number}`
  | `articles.${number}`
  | `articles.${number}.title`
  | `articles.${number}.sections`
  | `articles.${number}.date`
  | `articles.${number}.likes`
  | `articles.${number}.sections.${number}`
  | `articles.${number}.likes.${number}`
  | `articles.${number}.likes.${number}.name.${number}`
  | `articles.${number}.likes.${number}.age`
  | `articles.${number}.likes.${number}.name`;