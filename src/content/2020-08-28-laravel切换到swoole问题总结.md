---
title: laravel切换到swoole问题总结
date: 2020-08-28T22:39:11.923Z
draft: false
path: /blog/laravel切换到swoole问题总结
description: 单例,静态变量,全局常量
tags: ['laravel', 'swoole']
---
## 环境

| 名称                           | 版本   |
| ------------------------------ | ------ |
| PHP                            | 7.4.9  |
| Swoole                         | 4.5.2  |
| LaravelS(目前项目用的这个工具)    | 3.7.8  |
| Laravel Framework [local]      | 7.26.1 |

因为切换到swoole之后的问题数量非常多,因此以下简单按问题类型来记录

## 第一类问题:静态变量

如果一个静态变量参与了`.=`,`+=`,`*=`,`/=`,`-=`类似的运算就需要格外小心了,如果处理不当,它的值会不断变得不可预期,应谨慎使用

## 第二类问题:常量

在某个流程处理完成后，发送event事件通知其他listener前初始化了一个常量  

```php
!defined('CONSTANT_NAME') && define('CONSTANT_NAME', 'value');
```

用于后续listener(此处是同步的listener)可以直接获取这个常量的值,这在fpm模式下完全正常,因为每次请求完成都会释放资源  
在swoole模式下会导致第一次请求之后的其他请求无法重新初始化这个常量,因此需要谨慎使用这种写法  
参考解决方法:可通过类成员属性或实时取值的方式代替  

## 调试总结

- 调试过程中遇到时有时无的问题，先把swoole的dispatch_mode设置为4(ip_hash),保证每次调试请求分配到同一个worker上,方便复现问题
- laravel框架切换到swoole之后遇到的常见问题大多是单例引起的(也需要重点检查构造方法,静态变量,全局常量),单例问题可通过每次请求重新注册单例解决;如果无法通过全局配置批量处理单例问题,可使用new代替laravel的App::make,并在使用完实例后及时unset掉
