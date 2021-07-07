---
title: 使用apache2反向代理访问google
date: 2017-10-14T22:39:11.923Z
draft: false
path: /blog/使用apache2反向代理访问google
description: 实现不用科学上网也可以访问google
tags: ['apache']
---

> **引言**  
刚刚在[v2ex](https://www.v2ex.com/t/397631#reply17)上看到一篇用nginx做反向代理访问google的帖子,出于好奇,试了试用apache进行反向代理访问google,果然很好玩!

## 准备工作:
- apache服务器需要安装proxy相关模块,如果是ubuntu环境可以直接使用命令`sudo a2enmod 模块名称`进行安装,模块可以在`/etc/apache2/mods-available/`目录下查看,安装好的模块可以在`/etc/apache2/mods-enabled/`
里查看  
这里直接上配置:

```
<VirtualHost *:443>
    ServerName facebook.smarthippo.club
    SSLEngine on
    SSLCertificateFile "/etc/letsencrypt/archive/facebook.smarthippo.club/cert1.pem"
    SSLCertificateKeyFile "/etc/letsencrypt/archive/facebook.smarthippo.club/privkey1.pem"
	SetEnvIf User-Agent “.*MSIE.*” \
	nokeepalive ssl-unclean-shutdown \
	downgrade-1.0 force-response-1.0
	SSLProxyEngine On
	ProxyPass / https://www.facebook.com/
	ProxyPassReverse / https://www.facebook.com/
</VirtualHost>
<VirtualHost *:443>
    ServerName google.smarthippo.club
    SSLEngine on
    SSLCertificateFile "/etc/letsencrypt/archive/google.smarthippo.club/cert1.pem"
    SSLCertificateKeyFile "/etc/letsencrypt/archive/google.smarthippo.club/privkey1.pem"
	SetEnvIf User-Agent “.*MSIE.*” \
	nokeepalive ssl-unclean-shutdown \
	downgrade-1.0 force-response-1.0
	SSLProxyEngine On
	ProxyPass / https://www.google.com.hk/
	ProxyPassReverse / https://www.google.com.hk/
</VirtualHost>
```

So,[Google](https://google.smarthippo.club),[Wiki](https://wiki.smarthippo.club),就是这么简单~

> 备注:  
这篇文章的前提当然是有一个国外的服务器,安利一波[vultr(价格合理,且稳定,按天计费)](https://www.vultr.com/)
可以通过添加子域名的方式实现对不同墙外站点的访问,详见第二个配置
安装ssl证书[网上](https://www.zhukun.net/archives/8104)太多,就不写了  

## 目前存在的问题:
1. 在反向代理站点中如果有跳转到其他被墙站点的链接,依然无法访问
2. 部分网站对机器访问的请求有限制,比如google,虽然首页可以正常访问,但其他页面可能会访问不了,跳转到`ipv4.google.com`进行人机验证  

最后还是没能第二个问题...  
还是用科学上网吧...
