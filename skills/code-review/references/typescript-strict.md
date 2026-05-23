# TypeScript Strict Mode Best Practices

## 必须开启的 strict 选项

```jsonc
{
  "compilerOptions": {
    "strict": true,                    // 开启以下所有
    "noUncheckedIndexedAccess": true,  // strict 不含此项，需手动开
    "exactOptionalProperties": true    // 区分 undefined 和缺失
  }
}
```

## 严格空值检查 (strictNullChecks)

### 不要用 ! 断言跳过检查
```ts
// BAD: 运行时可能炸
const user = users.find(u => u.id === id)!;
doSomething(user.name);

// GOOD: 显式处理 null
const user = users.find(u => u.id === id);
if (!user) throw new NotFoundError(`User ${id} not found`);
doSomething(user.name);
```

### Optional chaining 与 nullish coalescing
```ts
// GOOD
const city = user?.address?.city ?? 'Unknown';

// BAD: || 会把 '' 和 0 也当 falsy
const port = config.port || 3000; // config.port = 0 时变成 3000
const port = config.port ?? 3000; // 正确
```

### 函数返回值显式标注
```ts
// BAD: 返回类型被推断为 string | undefined，调用者不知道
function getName(id: number) {
  if (id === 1) return 'Alice';
  // 隐式返回 undefined
}

// GOOD: 编译器会要求处理所有分支
function getName(id: number): string {
  if (id === 1) return 'Alice';
  return 'Unknown';
}
```

## 消灭 any

### 用 unknown 替代 any
```ts
// BAD
function parse(input: any) { return input.data; }

// GOOD: 强制调用者窄化类型
function parse(input: unknown): Data {
  if (!isValidInput(input)) throw new Error('Invalid');
  return input.data;
}
```

### 外部数据用 zod / valibot 验证
```ts
import { z } from 'zod';
const UserSchema = z.object({ name: z.string(), age: z.number() });
type User = z.infer<typeof UserSchema>;

const user = UserSchema.parse(await res.json()); // 运行时安全
```

### eslint 配合
```jsonc
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error"
}
```

## 实用工具类型

### 选择合适的内置类型
```ts
// 部分可选
type CreateUser = Omit<User, 'id' | 'createdAt'>;

// 只读
type Frozen<T> = Readonly<T>;

// 记录类型
type StatusMap = Record<Status, string>;

// 排除 null
type Defined<T> = NonNullable<T>;
```

### 自定义工具类型
```ts
// 深度只读
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 至少一个字段
type AtLeastOne<T> = {
  [K in keyof T]-?: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];
```

## 类型守卫

### 用 is 谓词缩窄类型
```ts
function isError(res: ApiResponse): res is ErrorResponse {
  return 'error' in res && typeof res.error === 'string';
}
```

### 区分联合类型用 discriminated union
```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function handle(r: Result<User>) {
  if (r.ok) {
    r.data; // 自动窄化为 User
  }
}
```
