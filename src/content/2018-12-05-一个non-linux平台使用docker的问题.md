---
title: 一个non-linux平台使用docker的问题
date: 2018-12-05T22:39:11.923Z
draft: false
path: /blog/一个non-linux平台使用docker的问题
description: 频繁的I/O操作导致
tags: ['docker']
---

### 相关问题
最近换了工作,新公司准备开发一个社区项目,从零开始开发.新电脑的环境使用自己为方便开发写的[基于docker-compose的环境](https://github.com/lestat220255/allindocker),框架使用[laravel5.5](https://github.com/laravel/laravel/releases/tag/v5.5.28),php版本`7.2`,mysql版本`5.7`,其他使用nginx作为web服务器,redis处理缓存  
刚开始就发现一个奇怪的问题:请求后台的每个页面响应时间都在1s以上(localhost),后来发现直接请求首页也是这样的高延迟,由于全局都没有类似`google`的静态文件引入,因此想到去网上找原因,在[Extremely slow on Windows 10](https://github.com/docker/for-win/issues/1936)中,提问者提到已经尝试过多种能想到的办法去优化设置,升级,以及修改docker的各项配置,但最终依然无法解决该问题  
我也尝试过在`Mac`和`Ubuntu Server`上使用docker,docker在`Mac`和`Windows`上的问题相似,加载速度也很慢,但在`Linux`上响应非常迅速,个人能想到的原因可能是在非`Linux`系统下的`docker`都是运行在虚拟机内,可能因为目录映射跨越宿主机和虚拟机导致了读写速度缓慢..  

[另一个参考](https://www.reddit.com/r/docker/comments/87uinr/docker_is_very_slow_on_windows_10/)  
[不同平台上的docker性能讨论](https://www.reddit.com/r/docker/comments/7xvlye/docker_for_macwindows_performances_vs_linux/)

### 个人结论
> 使用`non linux`平台的docker作为开发和测试环境都是可行且方便的,但一定不要作为生产环境!!!
