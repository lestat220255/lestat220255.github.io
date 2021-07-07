---
title: ngrok+nginx实现内网穿透
date: 2018-03-24T22:39:11.923Z
draft: false
path: /blog/ngrok+nginx实现内网穿透
description: 让外网访问你的本地服务
tags: ['ngrok']
---

> 写在前面:  
前天在qq群里看到有人在讨论替代花生壳的工具，说到了ngrok，说是可以实现花生壳一样的内网穿透，个人认为主要有以下几个用处:
1. 可以在公司测试服务器上搭建一个服务,实现测试站点的本地访问(公网访问本地服务器)，在这之前通常是上传网站到服务器并解析一个子域名，相对比较费时  
2. 微信接口开发的时候优势更明显，因为微信的OAuth一类认证需要一个公网域名且端口必须是80/443(也是本文需要用到nginx做反向代理的原因之一)  
3. 欢迎补充...  

## ngrok1.x介绍(2.x没有开源[官网](https://ngrok.com/))
![](https://lestat.b0.upaiyun.com/blog/ngrok-intro.png)
[ngrok1.x源码github地址](https://github.com/inconshreveable/ngrok)  
如上封面图所示

橘色屏幕的笔记本是你的工作机器，安装了ngrok客户端
ngrok.com所在的服务器安装了ngrok的服务端（ngrokd）
利用ngrok 8080命令可以将你本机的8080端口暴露给反向代理至ngrok.com的某个二级域名如：*.ngrok.com
公网用户可以通过*.ngrok.com就可以访问你本机8080端口上的站点内容了。
由此可见，借助ngrok，可以解决web项目(尤其是微信接口相关)开发过程经常遇到的“本地开发，外网调试”问题。  

## 先决条件  
1. 有一个域名,并解析到自己服务器上,如:`*.ngrok.lestat.me`
2. 有一个具备固定ip的公网服务器

## 部署
> 基本步骤:安装go环境->下载ngrok源码->使用go编译ngrok以及相关环境变量的设置->证书配置->运行ngrok服务器端并指定监听的http/https端口->nginx配置文件中对上一步中相关端口做反向代理配置->重启nginx->生成对应OS(linux,darwin,windows)的客户端->本地机器下载上一步生成的客户端->本地新建配置文件ngrok.cfg->本地运行客户端并指定配置文件->出现`online`则说明穿透成功

### 一个例子
#### 数据准备
本机地址 IP：127.0.0.1，HTTP 为 80
外网地址 IP：45.77.14.6，HTTP 为 80(NGINX监听该端口,并对*.ngrok.lestat.me域名进行转发到服务器的60端口)
域名为：http://*.ngrok.lestat.me
#### 预期结果
外网访问 http://*.ngrok.lestat.me可以访问到本机上80端口提供的网站  
下文按照前面的例子来搭建


### Go环境的安装
1. 下载并解压GOLANG

```
wget -c https://storage.googleapis.com/golang/go1.8.3.linux-amd64.tar.gz
tar -C /usr/local -zxvf go1.8.3.linux-amd64.tar.gz
```

2. 设置相关环境变量

```
export GOROOT=/usr/local/go
export PATH=$PATH:$GOROOT/bin
export GOPATH=$HOME/go
export GOROOT_BOOTSTRAP=/usr/local/go
```

3. 检查安装是否成功  
`go version`

### 安装ngrok
1. 下载并配置参数

```
cd /usr/local/
git clone https://github.com/inconshreveable/ngrok.git
export GOPATH=/usr/local/ngrok/
export NGROK_DOMAIN="ngrok.lestat.me"
cd ngrok
```

2. 生成证书  

```
openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -subj "/CN=$NGROK_DOMAIN" -days 5000 -out rootCA.pem
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=$NGROK_DOMAIN" -out server.csr
openssl x509 -req -in server.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out server.crt -days 5000
```

3. 将源码下的证书复制到指定位置  

```
cp rootCA.pem assets/client/tls/ngrokroot.crt
cp server.crt assets/server/tls/snakeoil.crt
cp server.key assets/server/tls/snakeoil.key
```

4. 编译服务器&客户端(linux64位),如果是32位系统则是`amd386`  

```
cd /usr/local/go/src
GOOS=linux GOARCH=amd64 ./make.bash
cd /usr/local/ngrok/
GOOS=linux GOARCH=amd64 make release-server release-client
```

编译Mac64位客户端

```
cd /usr/local/go/src
GOOS=darwin GOARCH=amd64 ./make.bash
cd /usr/local/ngrok/
GOOS=darwin GOARCH=amd64 make release-client
```

编译Windows64位客户端

```
cd /usr/local/go/src
GOOS=windows GOARCH=amd64 ./make.bash
cd /usr/local/ngrok/
GOOS=windows GOARCH=amd64 make release-client
```

### 服务端运行  
1. 进入到ngrok的bin目录下  

```
cd /usr/local/ngrok/bin
./ngrokd -domain="$NGROK_DOMAIN" -httpAddr=":60" -httpsAddr=":63"
```

2. 如果出现如下提示,说明服务端开启成功

```
[06:59:42 UTC 2018/03/24] [INFO] (ngrok/log.(*PrefixLogger).Info:83) [registry] [tun] No affinity cache specified
[06:59:42 UTC 2018/03/24] [INFO] (ngrok/log.Info:112) Listening for public http connections on [::]:60
[06:59:42 UTC 2018/03/24] [INFO] (ngrok/log.Info:112) Listening for public https connections on [::]:63
[06:59:42 UTC 2018/03/24] [INFO] (ngrok/log.Info:112) Listening for control and proxy connections on [::]:4443
[06:59:42 UTC 2018/03/24] [INFO] (ngrok/log.(*PrefixLogger).Info:83) [metrics] Reporting every 30 seconds
```

### 客户端运行与使用  
mac 客户端的位置：

```
/usr/local/ngrok/bin/darwin_amd64/ngrok
```

windows 客户端的位置：

```
/usr/local/ngrok/bin/windows_amd64/ngrok.exe
```

linux 客户端的位置：

```
/usr/local/ngrok/bin/ngrok
```

新建ngrok.cfg文件(配置文件)

```
server_addr: "ngrok.lestat.me:4443"
trust_host_root_certs: false
tunnels: #可定义多个域名
  test1:
   subdomain: "test1" #定义服务器分配域名前缀
   proto:
    http: 80 #映射端口，不加ip默认本机
  test2:
   subdomain: "test2" #定义服务器分配域名前缀
   proto:
    http: 81 #映射端口，不加ip默认本机
```

从命令行运行客户端文件,如下:
方法1:

```
./ngrok -config=ngrok.cfg -log=ngrok.log start test1
```

方法2:(最后一个8080代表映射的本地主机端口)

```
./ngrok -config=ngrok.cfg -log=ngrok.log -subdomain=test1 8080
```

如果返回相似于以下的内容,说明客户端启动成功  

```
Tunnel Status                 online                         
Version                       1.7/1.7                        
Forwarding                    https://hccrm.ngrok.lestat.me:60 -> 127.0.0.1:80  
Forwarding                    http://hccrm.ngrok.lestat.me:60 -> 127.0.0.1:80   
Web Interface                 127.0.0.1:4040                 
# Conn                        0                              
Avg Conn Time                 0.00ms
```

### nginx反向代理相关配置  
假设:  
1. ngrok监听http的端口为60
2. nginx监听了当前服务器的80端口(域名访问hccrm.ngrok.lestat.me时会直接访问到nginx监听的80端口,因此需要nginx转发)

```
server {
    listen       80;
    server_name  *.ngrok.lestat.me;

    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host  $http_host:60; #此处端口要跟 启动服务端ngrok 时指定的端口一致
        proxy_set_header X-Nginx-Proxy true;
        proxy_set_header Connection "";
        proxy_pass  http://127.0.0.1:60; # 反向代理对应的本地ip:port
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

重启nginx
`service nginx reload`

至此,已实现了内网穿透  
目前存在的问题:
1. 目前不知如何实现对本地虚拟主机的访问(例如本地apache上httpd-vhosts中配置的虚拟主机)  
2. 由于ngrok1.x已于两年前停止维护,再加上第一个问题1,因此后续准备写一篇关于[frp](https://github.com/fatedier/frp)的搭建记录,这是一个长期维护的开源项目,值得学习!  
