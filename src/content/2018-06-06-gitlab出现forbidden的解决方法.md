---
title: gitlab出现forbidden的解决方法
date: 2018-06-06T22:39:11.923Z
draft: false
path: /blog/gitlab出现forbidden的解决方法
description: 可能是配置问题
tags: ['gitlab']
---


### 问题
前些天在公司的测试服务器上基于docker安装了gitlab,今天同事突然反映gitlab地址访问的时候页面提示`Forbidden`,http状态码也是对应的`403`,于是google一下,发现原因可能是较多的并发导致的访问被拒绝

### 原因
> Gitlab使用rack_attack做了并发访问的限制

### 解决方法
配置`/etc/gitlab/gitlab.rb`文件,服务器当前使用的docker,对应目录是`/home/gitlab/config/gitlab.rb`(该目录/文件根据docker容器创建时指定的目录/文件映射关系决定)  

找到下面这段配置  
```shell
gitlab_rails['rack_attack_git_basic_auth'] = {
  'enabled' => true,
  'ip_whitelist' => ["127.0.0.1", "服务器公网ip"],
  'maxretry' => 10,
  'findtime' => 60,
  'bantime' => 3600
}
```

去掉注释,然后改为
```shell
gitlab_rails['rack_attack_git_basic_auth'] = {
  'enabled' => true,
  'ip_whitelist' => ["127.0.0.1", "服务器公网ip"],
  'maxretry' => 100,
  'findtime' => 60,
  'bantime' => 60
}
```

保存退出  

运行`docker exec 容器名称 gitlab-ctl reconfigure`
至此,上述问题解决  

> [参考链接:GitLab issuing temporary IP bans - 403 forbidden](https://stackoverflow.com/questions/36298959/gitlab-issuing-temporary-ip-bans-403-forbidden)