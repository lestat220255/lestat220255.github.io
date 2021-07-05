---
title: vps使用google的bbr脚本加速
date: 2018-06-06T22:39:11.923Z
draft: false
path: /blog/vps使用google的bbr脚本加速
description: Youtube 1080P轻松看
---


### 问题
从去年开始用vultr的vps,先是搭建了ssserver,然后各种web服务,以一个nginx为代理服务器,代理本地不同端口的各种服务,总体来说,vultr家的vps体验很好,除了一点:速度较慢,尤其是晚上8-11点(我买的是东京节点),之前在google上看了很久关于vps加速的方案,基本都是通过锐速,kcptun较多  
1. 锐速:国产软件,收费,且不开源,不开源,意味着可能被监控,所以直接pass  
2. kcptun:个人觉得麻烦,server端配了还要配client
最后:当时没发现google的bbr,于是将就用着,也还行,就是偶尔想看看youtube的时候只能看480p的,还卡的厉害...  
直到前几天,无意中看到google的tcp-bbr拥塞控制技术...  
[参考链接](https://github.com/google/bbr)

### 配置
1. 确认VPS的虚拟化技术不为`Openvz`(vultr的服务器都不是`Openvz`O(∩_∩)O哈哈~)
2. 下载脚本`wget --no-check-certificate https://github.com/teddysun/across/raw/master/bbr.sh`
3. 查看脚本支持的系统版本(支持内核版本大于4.9的系统),`cat ./bbr.sh`  
在脚本开始的注释中包含以下信息:
```shell
System Required:  CentOS 6+, Debian7+, Ubuntu12+
```

我当前的vps是`Ubuntu 18.04 LTS`,因此满足开启`tcp_bbr`的条件  
4. 赋予执行权限:`chmod +x ./bbr.sh`
5. 执行:`./bbr.sh`
6. 完成后使用`lsmod | grep tcp_bbr`查看`tcp_bbr`加速模块是否已经安装成功
7. 重启vps:`reboot`

### 效果
直接看YouTube的1080P视频吧,最直观,直接上图  
![](https://lestat.b0.upaiyun.com/blog/bbr_speed.jpg)
全程无卡顿  