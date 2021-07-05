---
title: Golang+Redis分布式可重入锁
date: 2021-07-05T14:57:51.923Z
draft: false
path: /blog/Golang+Redis分布式可重入锁
description: 自动重试,自动续期,可重入
---
### 概念

> [计算机科学](https://zh.wikipedia.org/wiki/计算机科学)中，**可重入互斥锁**（英語：reentrant mutex）是[互斥锁](https://zh.wikipedia.org/wiki/互斥锁)的一种，同一[线程](https://zh.wikipedia.org/wiki/线程)对其多次加锁不会产生[死锁](https://zh.wikipedia.org/wiki/死锁)。可重入互斥锁也称**递归互斥锁**（英語：recursive mutex）或**递归锁**（英語：recursive lock）。
>
> 如果对已经上锁的普通互斥锁进行「加锁」操作，其结果要么失败，要么会阻塞至解锁。而如果换作可重入互斥锁，[当且仅当](https://zh.wikipedia.org/wiki/当且仅当)尝试加锁的线程就是持有该锁的线程时，类似的加锁操作就会成功。可重入互斥锁一般都会记录被加锁的次数，只有执行相同次数的解锁操作才会真正解锁。
>
> 递归互斥锁解决了普通互斥锁[不可重入](https://zh.wikipedia.org/wiki/可重入)的问题：如果函数先持有锁，然后执行回调，但回调的内容是调用它自己，就会产生[死锁](https://zh.wikipedia.org/wiki/死锁)。
>
> 参考维基百科:[可重入互斥锁](https://zh.wikipedia.org/wiki/%E5%8F%AF%E9%87%8D%E5%85%A5%E4%BA%92%E6%96%A5%E9%94%81)



### 个人观点

在Go中应该很少会有这样的场景，互斥锁从字面上理解，应该不能接收重入，需要重入的场景也不应该考虑互斥锁。个人认为更好的解决方法是从设计的层面避免这种场景的出现。因此，与[基于redis的互斥锁](https://lestat220255.github.io/2021-05-03-Golang%E5%9F%BA%E4%BA%8Eredis%E5%AE%9E%E7%8E%B0%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81/)不同，**这篇文章仅仅是尝试在技术上的实现**，在实际应用中应尽可能避免这样的场景出现

[参考](https://groups.google.com/g/golang-nuts/c/XqW1qcuZgKg/m/Ui3nQkeLV80J?pli=1)



### 功能

在[基于redis的互斥锁(自动续期,自动重试)](https://lestat220255.github.io/2021-05-03-Golang%E5%9F%BA%E4%BA%8Eredis%E5%AE%9E%E7%8E%B0%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81/)的基础上允许重入  

实现的关键功能点:  

* 加锁：同一线程多次加锁时可以通过某个标识识别该线程为当前持有锁的线程，并且加锁次数+1
* 解锁：解锁时加锁次数-1，直到次数为0，则可以解锁(`DEL`)



### hash锁的结构

| Thread | KEY          | FIELD                                               | VALUE                 |
| ------ | ------------ | --------------------------------------------------- | --------------------- |
| A      | EXAMPLE_LOCK | 304597349587439(线程对应的随机数,标识锁,防止误解锁) | 1(当前线程已加锁次数) |



### 基本流程

在不可重入锁的实现里，只需要关心锁的互斥，误解除和自动续期，因此可以直接使用`string`类型配合`SETNX`,`PEXPIRE`,`DEL`完成加锁，解锁和续期

但可重入锁需要锁可以记录当前线程的标识和当前线程已加锁次数，就需要用`redis`的`hash`代替`string`。因为结构发生了变化，所以在加锁，解锁流程上也会有相应改变  



| Time | ThreadA                                                      | ThreadB                                                   |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------- |
| T1   | 尝试加锁                                                     | 尝试加锁                                                  |
| T2   | 加锁成功(key:EXAMPLE_LOCK,field:304597349587439,value:1)     | 加锁失败                                                  |
| T3   | 执行当前方法业务代码                                         | 尝试重试加锁并等待ThreadA解锁(根据配置间隔和最大重试次数) |
| T4   | 执行另一个方法业务代码，也可能是递归调用，并再次尝试加锁     |                                                           |
| T5   | 加锁成功(key:EXAMPLE_LOCK,field:304597349587439,value:2)     |                                                           |
| T6   | 执行新的调用方法内的业务代码,直到完成所有嵌套调用            |                                                           |
| T7   | 从最里层调用开始解锁,(key:EXAMPLE_LOCK,field:304597349587439,value:1) |                                                           |
| T8   | 返回到最外层第一次加锁的位置,解锁(key:EXAMPLE_LOCK,field:304597349587439,value:0) |                                                           |
| T9   | 如果当前已加锁次数为0，释放锁                                |                                                           |
| T10  |                                                              | 加锁成功                                                  |



加锁:  

```lua
-- KEYS[1]:锁对应的key
-- ARGV[1]:锁的expire
-- ARGV[2]:锁对应的计数器field(随机值,防止误解锁),记录当前线程已加锁的次数
-- 判断锁是否空闲
if (redis.call('EXISTS', KEYS[1]) == 0) then
    -- 线程首次加锁(锁的初始化,值和过期时间)
    redis.call('HINCRBY', KEYS[1], ARGV[2], 1);
    redis.call('PEXPIRE', KEYS[1], ARGV[1]);
    return 1;
end;
-- 判断当前线程是否持有锁(锁被某个线程持有,通常是程序第N次(N>1)在线程内调用时会执行到此处)
if (redis.call('HEXISTS', KEYS[1], ARGV[2]) == 1) then
    -- 调用次数递增
    redis.call('HINCRBY', KEYS[1], ARGV[2], 1);
    -- 不处理续期,通过守护线程续期
    return 1;
end;
-- 锁被其他线程占用,加锁失败
return 0;
```



解锁:  

```lua
-- KEYS[1]:锁对应的key
-- ARGV[1]:锁对应的计数器field(随机值,防止误解锁),记录当前线程已加锁的次数
-- 判断 hash set 是否存在
if (redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0) then
    -- err = redis.Nil
    return nil;
end;
-- 计算当前已加锁次数
local counter = redis.call('HINCRBY', KEYS[1], ARGV[1], -1);
if (counter > 0) then
  -- 同一线程内部多次调用完成后尝试释放锁会进入此if分支
    return 0;
else
  -- 同一线程最外层(第一次)调用完成后尝试释放锁会进入此if分支
	-- <=0代表内层嵌套调用已全部完成，可以解锁
    redis.call('DEL', KEYS[1]);
    return 1;
end;
-- err = redis.Nil
return nil;
```



[参考](https://segmentfault.com/a/1190000022931307)



## 代码实现



> 以下代码仅实现可重入加锁，自动续期，自动重试功能和本地测试，并不考虑封装或复用！



目录结构:  

```shell
├── main.go
└── reentrant_mutex
    └── lock.go
```



`lock.go`:  

```go
package reentrant_mutex

import (
	"context"
	"fmt"
	"github.com/go-redis/redis/v8"
	"math/rand"
	"sync"
	"time"
)

const KEY = "EXAMPLE_LOCK"

// Lock 用于测试的锁
type Lock struct {
	// redis连接池
	Rdb *redis.Client
	// hash锁key
	Key string
	// hash锁field(随机数,实时唯一)
	Field int
	// 锁有效期
	Expiration time.Duration
	// 用于测试的初始递归层数
	RecursionLevel int
	// 用于测试的最大递归层数
	MaxRecursionLevel int
	// 用于测试的任务最小执行时间
	Min int
	// 用于测试的任务最大执行时间
	Max int
	// 加锁失败的重试间隔
	RetryInterval time.Duration
	// 加锁失败的重试次数
	RetryTimes int
	// 继承*sync.Once的特性
	*sync.Once
	// 用于测试打印的线程标签
	Tag string
}

func init() {
	fmt.Println("initializing rand seed for rand testing...")
	rand.Seed(time.Now().UnixNano())
}

// 生成一个随机标签
func getRandTag(n int) string {
	var runes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	tag := make([]rune, n)
	for i := range tag {
		tag[i] = runes[rand.Intn(len(runes))]
	}
	return string(tag)
}

// NewLock 初始化
func NewLock(rdb *redis.Client) *Lock {
	l := Lock{
		Rdb:               rdb,
		Key:               KEY, // 固定值
		Field:             rand.Int(),
		Expiration:        time.Millisecond * 200,
		RecursionLevel:    1,
		MaxRecursionLevel: 1,
		Min:               50,
		Max:               100,
		RetryInterval:     time.Millisecond * 50,
		RetryTimes:        5,
		Once:              new(sync.Once),
		Tag:               getRandTag(2),
	}
	return &l
}

// MockBusiness 模拟分布式业务加锁场景
func (l *Lock) MockBusiness() {
	fmt.Printf("%s的第%d次调用,Field:%d\n", l.Tag, l.RecursionLevel, l.Field)

	// 初始化仅用于当前调用的ctx,避免在重入调用完成后执行cancel()导致的上层调用出现context canceled错误
	var ctx, cancel = context.WithCancel(context.Background())

	defer func() {
		// 延迟停止守护线程
		cancel()
	}()

	set, err := l.lock(ctx)

	if err != nil {
		fmt.Println(l.Tag + " 加锁失败:" + err.Error())
		return
	}

	// 加锁失败,重试
	if set == false {
		res, err := l.retry(ctx)
		if err != nil {
			fmt.Println(l.Tag + " 重试加锁失败:" + err.Error())
			return
		}
		// 重试达到最大次数
		if res == false {
			fmt.Println(l.Tag + " server unavailable, try again later")
			return
		}
	}

	fmt.Println(l.Tag + "成功加锁")

	// 加锁成功,通过守护线程自动续期(此处可以异步执行,即使自动续期还没来得及执行业务就已经完成,也不会影响流程)
	go l.watchDog(ctx)

	fmt.Println(l.Tag + "等待业务处理完成...")
	// 模拟处理业务(通过随机时间模拟业务延迟)
	time.Sleep(time.Duration(rand.Intn(l.Max-l.Min)+l.Min) * time.Millisecond)

	// 模拟重入调用(测试锁的可重入)
	if l.RecursionLevel <= l.MaxRecursionLevel {
		l.RecursionLevel += 1
		l.MockBusiness()
	}

	// 业务处理完成
	// 释放锁
	val, err := l.unlock(ctx)
	if err != nil {
		fmt.Println(l.Tag + "锁释放失败:" + err.Error())
		return
	}

	// 递归调用中的结果都是false,因为lua脚本中的if分支counter>0,没有释放
	fmt.Println(l.Tag+"释放结果:", val)
}

// 守护线程(通过sync.Once.Do确保仅在线程第一次调用时执行自动续期)
func (l *Lock) watchDog(ctx context.Context) {
	l.Once.Do(func() {
		fmt.Printf("打开了%s的守护线程\n", l.Tag)
		for {
			select {
			// 业务完成
			case <-ctx.Done():
				fmt.Printf("%s任务完成,关闭%s的自动续期\n", l.Tag, l.Key)
				return
				// 业务未完成
			default:
				// 自动续期
				l.Rdb.PExpire(ctx, l.Key, l.Expiration)
				// 继续等待
				time.Sleep(l.Expiration / 2)
			}
		}
	})
}

// 加锁
func (l *Lock) lock(ctx context.Context) (res bool, err error) {
	lua := `
-- KEYS[1]:锁对应的key
-- ARGV[1]:锁的expire
-- ARGV[2]:锁对应的计数器field(随机值,防止误解锁),记录当前线程已加锁的次数
-- 判断锁是否空闲
if (redis.call('EXISTS', KEYS[1]) == 0) then
    -- 线程首次加锁(锁的初始化,值和过期时间)
    redis.call('HINCRBY', KEYS[1], ARGV[2], 1);
    redis.call('PEXPIRE', KEYS[1], ARGV[1]);
    return 1;
end;
-- 判断当前线程是否持有锁(锁被某个线程持有,通常是程序第N次(N>1)在线程内调用时会执行到此处)
if (redis.call('HEXISTS', KEYS[1], ARGV[2]) == 1) then
    -- 调用次数递增
    redis.call('HINCRBY', KEYS[1], ARGV[2], 1);
    -- 不处理续期,通过守护线程续期
    return 1;
end;
-- 锁被其他线程占用,加锁失败
return 0;
`

	scriptKeys := []string{l.Key}

	val, err := l.Rdb.Eval(ctx, lua, scriptKeys, int(l.Expiration), l.Field).Result()
	if err != nil {
		return
	}

	res = val == int64(1)

	return
}

// 解锁
func (l *Lock) unlock(ctx context.Context) (res bool, err error) {
	lua := `
-- KEYS[1]:锁对应的key
-- ARGV[1]:锁对应的计数器field(随机值,防止误解锁),记录当前线程已加锁的次数
-- 判断 hash set 是否存在
if (redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0) then
    -- err = redis.Nil
    return nil;
end;
-- 计算当前可重入次数
local counter = redis.call('HINCRBY', KEYS[1], ARGV[1], -1);
if (counter > 0) then
-- 同一线程内部多次调用完成后尝试释放锁会进入此if分支
    return 0;
else
-- 同一线程最外层(第一次)调用完成后尝试释放锁会进入此if分支
-- 小于等于 0 代表内层嵌套调用已全部完成，可以解锁
    redis.call('DEL', KEYS[1]);
    return 1;
end;
-- err = redis.Nil
return nil;
`

	scriptKeys := []string{l.Key}
	val, err := l.Rdb.Eval(ctx, lua, scriptKeys, l.Field).Result()
	if err != nil {
		return
	}

	res = val == int64(1)

	return
}

// 重试
func (l *Lock) retry(ctx context.Context) (res bool, err error) {
	i := 1
	for i <= l.RetryTimes {
		fmt.Printf(l.Tag+"第%d次重试加锁中,Field:%d\n", i, l.Field)
		res, err = l.lock(ctx)

		if err != nil {
			return
		}

		if res == true {
			return
		}

		time.Sleep(l.RetryInterval)
		i++
	}
	return
}

```



`main.go`(测试加锁):  

```go
package main

import (
	"example/reentrant_mutex"
	"github.com/go-redis/redis/v8"
	"time"
)

func main() {
	// 初始化连接池
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})
	max := 2
	for i := 0; i < max; i++ {
		go reentrant_mutex.NewLock(rdb).MockBusiness()
	}
	time.Sleep(time.Second * time.Duration(max/2))
}
```



### 测试



测试环境:  

Redis:`Redis server v=6.2.3`

Go:`go version go1.14.6 darwin/amd64`



测试配置:

* 每个线程可重入次数1次(总加锁2次)

* 每个线程开启1个自动续期的守护线程(sync.Once.Do确保仅调用1次)

* 每个模拟业务延迟时间用50~100ms的范围随机生成

* `hash`锁的`field`通过线程初始化时生成,执行过程中`field`不变,`field`是判断一个锁是否属于当前线程唯一标准
* 加锁失败后重试次数为5，重试间隔为50ms
* 通过随机生成的`Tag`来标识线程以及打印流程
* 互斥锁的`KEY`为`EXAMPLE_LOCK`



测试结果:  

```shell
$ go run main.go                                                                                                                                          
initializing rand seed for rand testing...
oH的第1次调用,Field:3502865528850892548
8U的第1次调用,Field:4832526999886838931
oH成功加锁
oH等待业务处理完成...
打开了oH的守护线程
8U第1次重试加锁中,Field:4832526999886838931
8U第2次重试加锁中,Field:4832526999886838931
oH的第2次调用,Field:3502865528850892548
oH成功加锁
oH等待业务处理完成...
8U第3次重试加锁中,Field:4832526999886838931
8U第4次重试加锁中,Field:4832526999886838931
oH释放结果: false
oH释放结果: true
oH任务完成,关闭EXAMPLE_LOCK的自动续期
8U第5次重试加锁中,Field:4832526999886838931
8U成功加锁
8U等待业务处理完成...
打开了8U的守护线程
8U的第2次调用,Field:4832526999886838931
8U成功加锁
8U等待业务处理完成...
8U释放结果: false
8U释放结果: true
8U任务完成,关闭EXAMPLE_LOCK的自动续期
```

