---
title: 浅谈shadowsocks中的pac配置
date: 2018-02-14T22:39:11.923Z
draft: false
path: /blog/浅谈shadowsocks中的pac配置
description: 只为需要代理的请求做代理
---

大概是从去年开始使用的shadowsocks实现科学上网,当时在配置完代理服务器之后能够用了就没管其他的配置。  
直到最近想在维基百科上注册一个账号的时候发现  
![](https://lestat.b0.upaiyun.com/blog/wiki-forbidden.png)  
由于一些原因,当前使用代理的ip被封禁了  
由于GFW是通过[dns污染](https://zh.wikipedia.org/wiki/%E5%9F%9F%E5%90%8D%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%BC%93%E5%AD%98%E6%B1%A1%E6%9F%93)的方式屏蔽了zh.wikipedia.org(其他语言的wikipedia其实是可以在国内直接访问的比如[英文站](https://en.wikipedia.org)),这个问题可以通过关闭代理并修改hosts文件解决,但这样太麻烦,因为需要定期更新hosts文件的ip地址,后来google了一下发现shadowsocks里面有一个名为pac的文件,这个文件的域名列表来自于[GFWlist](https://github.com/gfwlist/gfwlist),而正是这个文件决定了shadowsocks处于pac模式时哪些域名需要被代理,在这个文件之外的域名都会直接访问。因此,解决维基的ip封禁且要继续使用代理上网只需要2个步骤  
1. 修改本地hosts为wikipedia中文当前的ip(解决dns污染)
2. 修改pac文件中的配置,将wikipedia.org相关的配置去掉即可  

**PAC的优势**
PAC自动代理属于智能判断模式，相比全局代理，它的优点有：  
1. 不影响国内网站的访问速度，防止无意义的绕路
2. 节省Shadowsocks服务的流量，节省服务器资源
3. 控制方便


