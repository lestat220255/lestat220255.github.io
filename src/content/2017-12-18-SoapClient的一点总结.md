---
title: SoapClient的一点总结
date: 2017-12-18T22:39:11.923Z
draft: false
path: /blog/SoapClient的一点总结
description: 一些需要注意的细节配置
tags: ['记录']
---

**近期在开发一个小型的酒店订房系统**  

---

**应用场景:**由于是在公司之前一个订房系统基础上进行修改,因此工作量不算大,但需要在系统中多个位置和酒店方提供的另一个PMS系统的信息进行对接(部分数据需要同步[库存,房间编号,订单信息等等]),接口使用`xml`格式进行数据传递,后端开发语言是php  

---

**问题:**开发中遇到的一个坑就是使用SoapClient在调用PMS系统接口的时候会出现间歇性404(Solution: Soap WSDL Error - "failed to load external entity")  

---

**解决方法:**向PMS接口提供方反应这个情况之后那边说接口正常,后来网上查阅才发现需要使用[libxml_disable_entity_loader(false)](http://php.net/manual/zh/function.libxml-disable-entity-loader.php)这个函数来打开`entity_loader`,随即问题解决.该函数通常添加在需要使用`SoapClient`实例的脚本上方
