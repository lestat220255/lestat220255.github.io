---
title: Golang+Redis分布式互斥锁
date: 2021-05-02T22:39:11.923Z
draft: false
path: /blog/Golang+Redis分布式互斥锁
description: 自动重试,自动续期
---
### 引言

假设我们的某个业务会涉及数据更新，同时在实际场景中有较大并发量。流程:读取->修改->保存，在不考虑基于DB层的并发处理情况下，这种场景可能对部分数据造成不可预期的执行结果，此时可以考虑使用分布式锁来解决该问题

### 需要解决的问题

1. 锁的误解除
2. 业务执行超时导致并发
3. 重试机制
4. `GET`和`DEL`非原子性

### 代码

目录结构:

```
│  main.go
│
└─demo
        lock.go
```

`lock.go`:  

```go

package demo

import (
	"context"
	"fmt"
	"github.com/go-redis/redis/v8"
	"math/rand"
	"time"
)

// 重试次数
var retryTimes = 5

// 重试频率
var retryInterval = time.Millisecond * 50

var rdb = redis.NewClient(&redis.Options{
	Addr:     "localhost:6379",
	Password: "", // no password set
	DB:       0,  // use default DB
})

// 锁的默认过期时间
var expiration time.Duration

// 模拟分布式业务加锁场景
func MockTest(tag string) {
	var ctx, cancel = context.WithCancel(context.Background())

	defer func() {
		// 停止goroutine
		cancel()
	}()

	// 随机value
	lockV := getRandValue()

	lockK := "EXAMPLE_LOCK"

	// 默认过期时间
	expiration = time.Millisecond * 200

	fmt.Println(tag + "尝试加锁")

	set, err := rdb.SetNX(ctx, lockK, lockV, expiration).Result()

	if err != nil {
		panic(err.Error())
	}

	// 加锁失败,重试
	if set == false && retry(ctx, rdb, lockK, lockV, expiration, tag) == false {
		fmt.Println(tag + " server unavailable, try again later")
		return
	}

	fmt.Println(tag + "成功加锁")

	// 加锁成功,新增守护线程
	go watchDog(ctx, rdb, lockK, expiration, tag)

	// 处理业务(通过随机时间延迟模拟)
	fmt.Println(tag + "等待业务处理完成...")
	time.Sleep(getRandDuration())

	// 业务处理完成
	// 释放锁
	val := delByKeyWhenValueEquals(ctx, rdb, lockK, lockV)
	fmt.Println(tag+"释放结果:", val)
}

// 释放锁
func delByKeyWhenValueEquals(ctx context.Context, rdb *redis.Client, key string, value interface{}) bool {
	lua := `
-- 如果当前值与锁值一致,删除key
if redis.call('GET', KEYS[1]) == ARGV[1] then
	return redis.call('DEL', KEYS[1])
else
	return 0
end
`
	scriptKeys := []string{key}

	val, err := rdb.Eval(ctx, lua, scriptKeys, value).Result()
	if err != nil {
		panic(err.Error())
	}

	return val == int64(1)
}

// 生成随机时间
func getRandDuration() time.Duration {
	rand.Seed(time.Now().UnixNano())
	min := 50
	max := 100
	return time.Duration(rand.Intn(max-min)+min) * time.Millisecond
}

// 生成随机值
func getRandValue() int {
	rand.Seed(time.Now().UnixNano())
	return rand.Int()
}

// 守护线程
func watchDog(ctx context.Context, rdb *redis.Client, key string, expiration time.Duration, tag string) {
	for {
		select {
		// 业务完成
		case <-ctx.Done():
			fmt.Printf("%s任务完成,关闭%s的自动续期\n", tag, key)
			return
			// 业务未完成
		default:
			// 自动续期
			rdb.PExpire(ctx, key, expiration)
			// 继续等待
			time.Sleep(expiration / 2)
		}
	}
}

// 重试
func retry(ctx context.Context, rdb *redis.Client, key string, value interface{}, expiration time.Duration, tag string) bool {
	i := 1
	for i <= retryTimes {
		fmt.Printf(tag+"第%d次尝试加锁中...\n", i)
		set, err := rdb.SetNX(ctx, key, value, expiration).Result()

		if err != nil {
			panic(err.Error())
		}

		if set == true {
			return true
		}

		time.Sleep(retryInterval)
		i++
	}
	return false
}

```

### 流程说明

> 假设`MockTest`方法就是业务处理方法

1. 初始化`context`用于控制守护线程的退出
2. 设置随机值尝试加锁(随机值在释放锁时可避免误释放)
3. 如果加锁不成功,尝试重试,重试机制根据业务而定,重试失败处理根据业务而定
4. 成功加锁后开启一个守护线程(`watchDog`),用于持续刷新锁的过期时间,保证在业务执行过程中锁不会过期
5. 模拟业务处理随机耗时
6. 业务处理完成后释放锁(`lua`处理保证原子性,并对比`value`避免误释放)
7. 通过`cancel`关闭守护线程(`watchDog`),避免死锁

### 应对场景

1. 线程获取到锁后异常终止,锁会在`expire`到期后自动释放
2. 线程执行时间超出锁的默认`expire`,通过`watchDog`自动续期,避免该情况发生

### 测试

`main.go`:  

```go
package main

import (
	"play/demo"
	"time"
)

func main() {
	go demo.MockTest("A")
	go demo.MockTest("B")
	go demo.MockTest("C")
	go demo.MockTest("D")
	go demo.MockTest("E")
	// 用于测试goroutine接收到ctx.Done()信号后的打印
	time.Sleep(time.Second * 2)
}

```

结果:  

```
$ go run main.go
A尝试加锁
D尝试加锁
E尝试加锁
B尝试加锁
C尝试加锁
D成功加锁
D等待业务处理完成...
B第1次尝试加锁中...
E第1次尝试加锁中...
A第1次尝试加锁中...
C第1次尝试加锁中...
B第2次尝试加锁中...
D释放结果: true
B成功加锁
E第2次尝试加锁中...
B等待业务处理完成...
C第2次尝试加锁中...
A第2次尝试加锁中...
D任务完成,关闭EXAMPLE_LOCK的自动续期
A第3次尝试加锁中...
C第3次尝试加锁中...
E第3次尝试加锁中...
B释放结果: true
A成功加锁
A等待业务处理完成...
B任务完成,关闭EXAMPLE_LOCK的自动续期
E第4次尝试加锁中...
C第4次尝试加锁中...
A释放结果: true
A任务完成,关闭EXAMPLE_LOCK的自动续期
C第5次尝试加锁中...
E第5次尝试加锁中...
C成功加锁
C等待业务处理完成...
E server unavailable, try again later
C释放结果: true
C任务完成,关闭EXAMPLE_LOCK的自动续期
```

偷懒就没写单元测试了🤦‍