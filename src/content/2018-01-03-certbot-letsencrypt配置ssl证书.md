---
title: certbot+letsencrypt配置免费单证书多域名ssl证书
date: 2018-01-03T22:39:11.923Z
draft: false
path: /blog/certbot+letsencrypt配置免费单证书多域名ssl证书
description: 可配合定时任务实现自动续期
tags: ['ssl']
---


**前些天看到微信公众平台官方公告[关于公众平台接口不再支持HTTP方式调用的公告](https://mp.weixin.qq.com/cgi-bin/announce?action=getannouncement&announce_id=1505983913&version=&lang=zh_CN)之后决定把项目的协议从`http`改成`https`,于是开始在网上查,完成之后总结了一点经验**  

> 本文演示的是通用证书,即在`certbot`命令中不需要指定`--apache`或者`--nginx`之类,只需要在完成证书生成之后在服务器配置文件里进行引用即可

### Let’s Encrypt
Let’s Encrypt 认证签发为每3个月一次，也就是每 90 天必须更新（renew）一次。取得认证的过程需要进主机安裝代理程序:[certbot](https://certbot.eff.org/),下面以ubuntu为例:  

* 安装
```
$ sudo apt-get update
$ sudo apt-get install software-properties-common
$ sudo add-apt-repository ppa:certbot/certbot
$ sudo apt-get update
$ sudo apt-get install certbot
```
* 生成证书

```
$ sudo certbot certonly
```

此时会出现选项,按照提示选择即可  

* 证书自动续期可以使用

```
certbot renew --force-renew
```

手动强制为证书续期  
如果出现以下提示则说明更新成功

```
Congratulations, all renewals succeeded. The following certs have been renewed:
```

但为了更方便,通常使用`crontab -e`编辑定时任务,并加入

```
0 0 1 * * certbot renew --force-renew “重启服务器命令”
```

实现每个月1号0点自动续期

### 在服务器配置相关证书
[apache2开启SSL](https://lestatmiao.github.io/2017/09/08/apache2-ssl/)

**tips:**
如果有多个域名  
1. 可以用过在`Please enter in your domain name(s) (comma and/or space separated)  (Enter 'c'
to cancel):`步骤通过`,`来分隔域名
2. 可以使用以下命令来直接生成多个域名的证书  

```
$ sudo certbot certonly --webroot -w /var/www/example -d example.com -d www.example.com -w /var/www/thing -d thing.is -d m.thing.is
```

3. 生成的证书通常保存在`/etc/letsencrypt/live/`目录下

> 注意:如果失败超过5次会被服务器屏蔽1小时

### 后记  
以上操作完成后在pc端浏览器可正常读取证书并显示绿色锁,但在部分移动端浏览器上可能提示证书无效,原因可以参考[合并SSL服务器证书和CA包(证书链文件)
](https://blog.v2ssl.com/2017/02/07/%E5%90%88%E5%B9%B6ssl%E6%9C%8D%E5%8A%A1%E5%99%A8%E8%AF%81%E4%B9%A6%E5%92%8Cca%E5%8C%85%E8%AF%81%E4%B9%A6%E9%93%BE%E6%96%87%E4%BB%B6.html)  
简单来说,可以通过合并SSL服务器证书和CA包(证书链文件)
即:复制fullchain.pem里的内容至cert.pem,重启服务器即可
