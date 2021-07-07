---
title: 同一页面巧妙使用多个element-ui的upload组件
date: 2018-06-30T22:39:11.923Z
draft: false
path: /blog/同一页面巧妙使用多个element-ui的upload组件
description: element-ui多组upload组件使用技巧
tags: ['vue', 'element-ui']
---


### 问题
最近在使用SSR(服务器端渲染)方式引入`vue`+`element-ui`开发一个商城项目的时候遇到一个问题:因为商城的订单是可能包含多个商品,所以订单的评价涉及到同一个页面多组表单的异步提交(每一组表单包含评价内容和上传的多张图片)  
由于`element-ui`的`upload`组件默认没有提供多个组件在同一页面绑定不同模型的接口,因此在网上搜了一下,搜到了[这篇文章](https://www.guoxiongfei.cn/cntech/2701.html),文章中最后的建议是自己封装一个组件来调用`upload`组件,使用的时候直接调用自己封装的这个组件,但是项目时间紧迫,我这边希望更快的搞定这个问题,于是想到了以下办法  


### 解决方法
在`upload`组件的接口中,有一个`data`接口,可以绑定需要上传的除文件之外的其他数据对象,由于订单评价页的一个特点:每个商品不论数量大小都只会被评价一次,因此此处直接将当前数组中商品的uuid绑定到data并传递至上传接口,此操作后表单提交的payload就会包含类似如下数据:
```
Content-Disposition: form-data; name="uuid"

E7D947BA-79F1-11E8-B786-00163E063020
```
而后台文件上传位置可以做一个判断:如果接收的上传请求包含额外参数,则全部原路返回,因此在上传成功后又会在`on-success`这个钩子接收到这个唯一的uuid,此处对当前页面商品数组进行遍历并进行比对,在包含返回的`uuid`对应数组的对应保存组图路径的数组`push`当前上传成功的图片路径  

```javascript
this.data.goods_list.forEach((e,k)=>{
    if(e.uuid === response.uuid){
        e.evaluate.thumbs.push(response.url)
    }
})
```

以下是完整代码(html):  
```html
<div class="userEva-cont" v-for="(item,key) in data.goods_list">
    <table class="userEva-table">
        <thead>
        <tr>
            <th width="420">商品</th>
            <th width="280">型号</th>
            <th width="280">数量</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td>
                <div class="evaluate-pic"><a :href="'/product/'+item.goods_id+'.html'"><img :src="'__PHOTO__'+item.thumb"></a></div>
                <div class="evaluate-text">
                    <h3><a>{{item.goods_name}}</a></h3>
                    <p>编号：{{item.uuid}}</p>
                </div>
            </td>
            <td>型号：{{item.goods_specification_name}}</td>
            <td>{{item.num}}</td>
        </tr>
        </tbody>
    </table>
    <div class="evaluate-wrap">
        <form>
            <dl>
                <dt>评论：</dt>
                <dd>
                    <textarea v-model="item.evaluate.content" placeholder="评论内容"></textarea>
                </dd>
            </dl>
            <dl>
                <dt>晒单：</dt>
                <dd>
                    <el-upload
                            class="upload-demo"
                            :action="basePath"
                            :on-preview="handlePreview"
                            :on-remove="handleRemove"
                            drag
                            multiple
                            :data="item"
                            :limit="5"
                            :on-success="setFileList"
                            list-type="picture">
                        <i class="el-icon-upload"></i>
                        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
                        <div class="el-upload__tip" slot="tip">只能上传jpg/png文件，且不超过500kb</div>
                    </el-upload>
                </dd>
            </dl>
            <div class="evaluate-btns">
                <button type="button" class="evaluate-sub" @click="submit(item.evaluate,item)">提交评价</button>
                <label><input type="checkbox" class="evaluate-show" v-model="item.evaluate.is_anonymous">匿名评价</label>
            </div>
        </form>
    </div>
</div>
```

js
```javascript
/*
    * todo:初始化vue
    * */
var app = new Vue({
    el: '#container',
    data: {
        data: __PAGE_DATA__,
        evaluateUrl: '/evaluate.html',
        imgDialogVisible: false,
        tempPath: '',
        basePath: ''
    },
    mounted() {
        this.basePath = Vue.prototype.fileUploadBasePath
    },
    methods: {
        handleRemove(file, fileList) {
            this.data.goods_list.forEach((e,k)=>{
                if(e.uuid === file.response.uuid){
                    //找到当前url下标
                    const index = e.evaluate.thumbs.indexOf(file.response.url)
                    if(index !== -1){
                        //删除
                        e.evaluate.thumbs.splice(index,1)
                    }
                }
            })
        },
        handlePreview(file) {
            this.tempPath = file.response.url
            this.imgDialogVisible = true
        },
        setFileList(response, file, fileList){
            this.data.goods_list.forEach((e,k)=>{
                if(e.uuid === response.uuid){
                    e.evaluate.thumbs.push(response.url)
                }
            })
        },
        submit(evaluate,item){
            evaluate.id = item.goods_id
            evaluate.goods_name = item.goods_name
            evaluate.goods_specification_name = item.goods_specification_name
            evaluate.order_id = this.data.goods.o_id
            evaluate = Object.assign({}, evaluate)

            this.$http.post(this.evaluateUrl,{no:this.data.goods.o_orderno,evaluate:evaluate}).then(response => {
                if(response.data.status === 200){
                    //重新拉取数据
                    this.$http.get(location.href).then(function(response){
                        if(response.data.status === 200){
                            this.$message({
                                message:'评价成功!',
                                type:'success'
                            })
                            //重新拉取数据
                            this.data = response.data.data
                        }
                    }).catch(e => {})
                }else{
                    this.$message({
                        message:response.data.message,
                        type:'error'
                    })
                }
            }).catch(e => {})
        }
    }
})
```

> 至此,经过测试,解决了同一页面多个upload组件上传预览并分别异步提交对应表单到后台的问题