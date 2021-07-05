---
title: 使用cloudflare加持你的网站
date: 2018-10-17T22:39:11.923Z
draft: false
path: /blog/使用cloudflare加持你的网站
description: I'm Under Attack
---

### CloudFlare
简单地说，[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)就是通过基于反向代理的内容分发网络（Content Delivery Network,CDN）及分布式域名解析服务（Distributed Domain Name Server），帮助受保护站点抵御包括拒绝服务攻击在内的大多数网络攻击，确保该网站长期在线，同时提升网站的性能、加载速度以改善访客体验。  

### 作用
对于个人站来说,可以有效防御小规模DDos攻击,可以使用[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)提供的免费ssl证书,可以加速网站的访问(如果是境外服务器的话,国内可以考虑用阿里云的cdn服务),且以上的服务都是免费的!

### 域名服务器修改步骤
1. [注册](https://dash.cloudflare.com/sign-up)一个[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)账号后登入
2. 点击「Add Site」,输入域名,之后一直「Next」,系统会加载当前域名的dns列表,不管它,然后复制后面出现的dns服务器地址至当前域名提供商的控制台替换掉默认的dns服务器地址即可,等待几分钟时间即出现`Active`,说明此时该域名已通过[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)的域名服务器对访问进行解析

### dns配置
跟很多域名提供商(如万网,godaddy)的dns配置面板相似,[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)的dns配置不同之处在于可以在`Status`项切换开关颜色为「灰色」/「橙色」,灰色表示只使用[CloudFlare](https://zh.wikipedia.org/wiki/CloudFlare)的dns,橙色表示同时还使用cdn
如图:  
![dns](https://ws1.sinaimg.cn/large/005NqLEEgy1fwblpq2zc3j31pe17y0xw.jpg)

### ssl证书配置
在crypto选项卡中,针对ssl设置有四种模式
> Off: No visitors will be able to view your site over HTTPS; they will be redirected to HTTP.  
> Flexible SSL: You cannot configure HTTPS support on your origin, even with a certificate that is not valid for your site. Visitors will be able to access your site over HTTPS, but connections to your origin will be made over HTTP. Note: You may encounter a redirect loop with some origin configurations.  
> Full SSL: Your origin supports HTTPS, but the certificate installed does not match your domain or is self-signed. Cloudflare will connect to your origin over HTTPS, but will not validate the certificate.  
> Full (strict): Your origin has a valid certificate (not expired and signed by a trusted CA or Cloudflare Origin CA) installed. Cloudflare will connect over HTTPS and verify the cert on each request.  

* Flexible SSL：
部分SSL加密连接，你不必拥有SSL证书。直接使用Cloudflare免费SSL。用户连接到Cloudflare是采用加密连接，从Cloudflare到主机则不走加密连接。
> 此选项可能会因为主机配置冲突导致[反复重定向](https://support.cloudflare.com/hc/en-us/articles/115000219871)  

* Full SSL：
全程SSL加密连接，你必须拥有一个SSL证书在你的主机上，不过Cloudflare并不会检查你的SSL证书是自己签署或第三方公正单位发下來的。
* Full SSL(Strict)：
全程使用SSL加密连接，你必须拥有一个SSL证书在你网站上，而且Cloudflare会检查你主机端的SSL证书是否为第三方公正单位签署(不能使用自己签署的)。
选择符合自己主机情况的即可
后面配置项还可配置重定向所有`http`请求到`https`
![crypto](https://ws1.sinaimg.cn/large/005NqLEEgy1fwblprndivj31qe16ytg2.jpg)


### Speed加速配置
配置最小化静态文件
![speed](https://ws1.sinaimg.cn/large/005NqLEEgy1fwblpq2mdbj31qq166n2p.jpg)

### 效果
使用curl命令查看Response Headers
```
curl -I https://lestat220255.github.io
HTTP/1.1 301 Moved Permanently
Date: Wed, 17 Oct 2018 15:11:38 GMT
Connection: keep-alive
Cache-Control: max-age=3600
Expires: Wed, 17 Oct 2018 16:11:38 GMT
Location: https://lestat220255.github.io
Server: cloudflare
CF-RAY: 46b3b2eb020920c0-LAX
```

**搞定!**