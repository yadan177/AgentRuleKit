# 规则包内容来源逐文件清单

本清单由 `node scripts/generate-provenance-inventory.mjs --write` 从当前 `rulepacks/` 清单和文件内容生成；CI 用 `--check` 检查同步。SHA-256 按 CRLF 转 LF 后的文本计算，以便跨平台复核。它只提供人工复核线索，不判断原创性、许可或公开权限。文件内容变化会改变摘要；已完成的人工授权记录必须针对变更重新核对。迁移前的规则内容仍可在 Git 历史中查阅并需单独审查。

当前纳入 14 个规则包、116 份 Markdown；5 份包含明确的来源措辞线索，24 份含外部 URL。没有线索或外链不代表内容由本仓库原创；有外链也不代表正文来自该网站。

## 规则包汇总

| 规则包 | 收录文件数 |
|---|---:|
| `common` | 1 |
| `go` | 14 |
| `java` | 15 |
| `javascript` | 17 |
| `pico` | 1 |
| `project-docs/go` | 5 |
| `project-docs/java` | 5 |
| `project-docs/js-ts` | 5 |
| `project-docs/python` | 5 |
| `project-docs/unity` | 5 |
| `python` | 15 |
| `rule-authoring` | 1 |
| `typescript` | 10 |
| `unity` | 17 |

## 逐文件复核索引

来源线索列只标记匹配行号，须打开正文核对上下文；外链域名仅说明文本出现过 URL。人工审查结论记录在 [内容权利复核表](content-rights-review.md)，不能直接在自动生成清单中勾选。

| 文件 | 规范化文本 SHA-256 | 来源线索行 | 外链域名 |
|---|---|---|---|
| [`rulepacks/common/entry.md`](<../rulepacks/common/entry.md>) | `dcbf442758430f13a28c3452ff435cfec8a12ef2a0c609d68ff9aede08e5c132` | — | — |
| [`rulepacks/go/00-文档总览.md`](<../rulepacks/go/00-文档总览.md>) | `015228d53a2611b962ac36d6380f91e1eacb8c2c2b37ab0b37576aefe59f036a` | L115 | github.com |
| [`rulepacks/go/13-AI通用入口规则.md`](<../rulepacks/go/13-AI通用入口规则.md>) | `261175f49ca34786a80b4d245ab053910b999d2a5d31a70c3456c800da6e6382` | — | — |
| [`rulepacks/go/其他规则/01-代码编写规则.md`](<../rulepacks/go/其他规则/01-代码编写规则.md>) | `7ea4a9918c635d3b2476a0f3e819a64fb5c577c4659d4aff4b557720de3ce2e8` | L801 | github.com, pkg.go.dev |
| [`rulepacks/go/其他规则/02-模式设计.md`](<../rulepacks/go/其他规则/02-模式设计.md>) | `7e911ea20f92cbb618cbfc06f2ef5a1ee3b01c94bd641d454ef1e19861e296e2` | — | github.com |
| [`rulepacks/go/其他规则/03-性能优化.md`](<../rulepacks/go/其他规则/03-性能优化.md>) | `019419212468e074cfc9ba4f0a8b94b79545852d1da2d9f3e0d1f8787ffe3f93` | L8 | github.com, go.dev |
| [`rulepacks/go/其他规则/04-API设计规则.md`](<../rulepacks/go/其他规则/04-API设计规则.md>) | `0da96961698d6d757934897871872ac75b09d9f5714c60608a5982408e342e95` | L121 | github.com |
| [`rulepacks/go/其他规则/05-数据库与持久化.md`](<../rulepacks/go/其他规则/05-数据库与持久化.md>) | `303b807bb4e834efedd032000319e1206b1f47fd46bd3aacbbb9ac535b8137a3` | — | atlasgo.io, github.com, pkg.go.dev |
| [`rulepacks/go/其他规则/06-项目配置规则.md`](<../rulepacks/go/其他规则/06-项目配置规则.md>) | `60f826dcf6f53b60799a3af4905d73278e9ae602f0b5ee04cd6f0326af7ebab8` | — | github.com |
| [`rulepacks/go/其他规则/07-日志调试规则.md`](<../rulepacks/go/其他规则/07-日志调试规则.md>) | `3a05104889258fac50893d9582f0bc048c034158f3f0e23e21372850daf97c0c` | — | — |
| [`rulepacks/go/其他规则/08-版本控制规则.md`](<../rulepacks/go/其他规则/08-版本控制规则.md>) | `7c9beb4cd7f9ef0f3d855c0c512cd49012d8b53d96d0e9e91cd5927f932b3869` | — | semver.org |
| [`rulepacks/go/其他规则/09-依赖与构建.md`](<../rulepacks/go/其他规则/09-依赖与构建.md>) | `501f1e1f44fc980b6eebcfbadb17b87c1c82048ed44c009437bb4910f021979c` | — | semver.org |
| [`rulepacks/go/其他规则/10-代码风格规则.md`](<../rulepacks/go/其他规则/10-代码风格规则.md>) | `7d2503022943a77cc0773ed76336a17eed4bed9902dcbb265fe72ae30bf45a2e` | — | golangci-lint.run |
| [`rulepacks/go/其他规则/11-测试与可观测性.md`](<../rulepacks/go/其他规则/11-测试与可观测性.md>) | `87b6c2f77246c40be005be4867b6354470a59fba0eba9a825e8ae9665763247c` | — | prometheus.io |
| [`rulepacks/go/其他规则/12-安全规则.md`](<../rulepacks/go/其他规则/12-安全规则.md>) | `8be05382160aff6aacdde1294587c4cbac8b4d679279540ac1ff74d1bc3909cf` | — | 169.254.169.254, admin.example.com, app.example.com, owasp.org |
| [`rulepacks/java/00-文档总览.md`](<../rulepacks/java/00-文档总览.md>) | `66e9a4c3f7f61af694c62b801ab5d6e7d13dcbe14a0d81b2b14a157d28c7e13d` | L118 | github.com |
| [`rulepacks/java/14-AI通用入口规则.md`](<../rulepacks/java/14-AI通用入口规则.md>) | `a636566e9bdb744ee71f265e4ae75a1ff855c35e7cdca68ab1c046643de4e068` | — | — |
| [`rulepacks/java/其他规则/01-代码编写规则.md`](<../rulepacks/java/其他规则/01-代码编写规则.md>) | `43f5fdbbdaac7f36a6fa3065ddd55626b405cdc024604f39de3db05bd045ef86` | — | — |
| [`rulepacks/java/其他规则/02-代码风格规则.md`](<../rulepacks/java/其他规则/02-代码风格规则.md>) | `9e64690deec7a92d321bbbaccdf6f9898ab9562cc7632ffea117a24cbfd58372` | — | checkstyle.org |
| [`rulepacks/java/其他规则/03-异常处理规则.md`](<../rulepacks/java/其他规则/03-异常处理规则.md>) | `7f0caa48225ec3c3648ca701aada6bc90a0e8d3616a805f163d77e776c3ee1a6` | — | — |
| [`rulepacks/java/其他规则/04-并发编程规则.md`](<../rulepacks/java/其他规则/04-并发编程规则.md>) | `926a96bcc326e2d4d674f16e61c296f59e2bf09d339a090123bca532c743c6bb` | — | — |
| [`rulepacks/java/其他规则/05-模式设计规则.md`](<../rulepacks/java/其他规则/05-模式设计规则.md>) | `e14acc41fd1c31c3ecaf840e028cd4c46c15c7874efac44d23f62f427dd80200` | — | — |
| [`rulepacks/java/其他规则/06-Web-API设计规则.md`](<../rulepacks/java/其他规则/06-Web-API设计规则.md>) | `06b8fbe7810b58a8cc177fd4d3f8db7b0f2b46dc8ae7132419c27474e4c2427f` | — | app.example.com |
| [`rulepacks/java/其他规则/07-数据访问规则.md`](<../rulepacks/java/其他规则/07-数据访问规则.md>) | `b4c1a0d52869b68ee91bc15548dbb1cf0b34a9ee4795463a897f6e7e2282b043` | — | — |
| [`rulepacks/java/其他规则/08-测试规则.md`](<../rulepacks/java/其他规则/08-测试规则.md>) | `fa86336feaab816cee618fea7f694558b8a008613e577c8a2afadbbbde0f4a17` | — | — |
| [`rulepacks/java/其他规则/09-日志调试规则.md`](<../rulepacks/java/其他规则/09-日志调试规则.md>) | `285b89052423812ce0c4a725ee3c6931eb72d223ed29f06f0f36fe3d7ffe1db9` | — | — |
| [`rulepacks/java/其他规则/10-版本控制规则.md`](<../rulepacks/java/其他规则/10-版本控制规则.md>) | `1faa4d6e4eede4d93152310ea116cdf3eca83cd80c6361564e79de90a85a3b19` | — | — |
| [`rulepacks/java/其他规则/11-性能优化规则.md`](<../rulepacks/java/其他规则/11-性能优化规则.md>) | `dc19b5efd1c66edb4720095f8daeef7800b7b51248318220455841fa8503e6ea` | — | arthas.aliyun.com |
| [`rulepacks/java/其他规则/12-安全规则.md`](<../rulepacks/java/其他规则/12-安全规则.md>) | `9f878899f9b1a336ac2a3cf191bfdc4532877a49ce22ed5326c63a0b7f9df048` | — | 169.254.169.254, admin.example.com, app.example.com, github.com, xn--`-h47aw02l |
| [`rulepacks/java/其他规则/13-部署运维规则.md`](<../rulepacks/java/其他规则/13-部署运维规则.md>) | `14a0a07c1c1518970eb6f66978d0851c9a8350a58724164b17f415a23828fe8c` | — | — |
| [`rulepacks/javascript/00-文档总览.md`](<../rulepacks/javascript/00-文档总览.md>) | `083e98793c94eb5e18d064c488cc0ce44d0a84fc4a37f3fcec4d03fd1cd39937` | — | — |
| [`rulepacks/javascript/15-AI通用入口规则.md`](<../rulepacks/javascript/15-AI通用入口规则.md>) | `7756ab99bbf53f4f03a2a0a93e3260eeece0c8048f672405431273cf5ae5d4f8` | — | — |
| [`rulepacks/javascript/其他规则/01-代码编写规则.md`](<../rulepacks/javascript/其他规则/01-代码编写规则.md>) | `cfee9626ae657710fd7669b71d041caf51897c76014946286a14d783c5a68254` | — | api.example.com |
| [`rulepacks/javascript/其他规则/02-模式设计规则.md`](<../rulepacks/javascript/其他规则/02-模式设计规则.md>) | `22166e0529f8bf93fa469d8e2cd4ab4c078320fc7b893c4be347176e2fd795c4` | — | — |
| [`rulepacks/javascript/其他规则/03-性能优化规则.md`](<../rulepacks/javascript/其他规则/03-性能优化规则.md>) | `f0fba217f8329f4dd39ad1efdde40f059d7cd763fb35be499c572813681689c7` | — | — |
| [`rulepacks/javascript/其他规则/04-异步与事件循环.md`](<../rulepacks/javascript/其他规则/04-异步与事件循环.md>) | `e18d525362c1bd91762a976b5d8a83600c0a6ab53d2c96d18627d6078060ae35` | — | — |
| [`rulepacks/javascript/其他规则/05-数据访问规则.md`](<../rulepacks/javascript/其他规则/05-数据访问规则.md>) | `ecb54e1608038474afa76a7df0698c492c5d5a09e4c1d16ae751496c77577466` | — | — |
| [`rulepacks/javascript/其他规则/06-项目配置规则.md`](<../rulepacks/javascript/其他规则/06-项目配置规则.md>) | `caff2babb78b5aec3981e6058abb6c47f6b02e5e5c9d81f7a8cf2566967ae3a3` | — | — |
| [`rulepacks/javascript/其他规则/07-日志调试规则.md`](<../rulepacks/javascript/其他规则/07-日志调试规则.md>) | `c0e06714f119eb3f3aa045ae300031756a99acb8988623fa38d0d96af279db02` | — | — |
| [`rulepacks/javascript/其他规则/08-测试规则.md`](<../rulepacks/javascript/其他规则/08-测试规则.md>) | `a6f8201641abc4dc109b53bbab211972a6dbc8e144544d6e055027030ebed2dc` | — | — |
| [`rulepacks/javascript/其他规则/09-版本控制规则.md`](<../rulepacks/javascript/其他规则/09-版本控制规则.md>) | `47014f410795e4f8857695be9323b4d5331df91dd0161c9ef6a5d1d49bda793e` | — | — |
| [`rulepacks/javascript/其他规则/10-代码风格规则.md`](<../rulepacks/javascript/其他规则/10-代码风格规则.md>) | `c6f12323ec5fbd450091384d05b0c4f705320125c9bc6ec4c9bc6c74972261f2` | — | api.example.com |
| [`rulepacks/javascript/其他规则/11-安全规则.md`](<../rulepacks/javascript/其他规则/11-安全规则.md>) | `442614066673c3d7daed212b724b91f38c0dab35b20e93c0f542d15e62060b57` | — | — |
| [`rulepacks/javascript/其他规则/12-JS常见反模式.md`](<../rulepacks/javascript/其他规则/12-JS常见反模式.md>) | `3cfdfdccf08e186ead3b16472782381a8f64f6f6d33a9cf15e3cdf44b9a3d1d2` | — | — |
| [`rulepacks/javascript/其他规则/13-React组件规则.md`](<../rulepacks/javascript/其他规则/13-React组件规则.md>) | `78762a931ccab61e1127d592c8964f314bcdef580a41da22a1b870c3efb4eabe` | — | — |
| [`rulepacks/javascript/其他规则/14-CSS与样式体系规则.md`](<../rulepacks/javascript/其他规则/14-CSS与样式体系规则.md>) | `a7f5b55d8e97c79ce2c012af54c90fc8fae897afcef7d5f681d4bd80905b41dc` | — | — |
| [`rulepacks/javascript/其他规则/16-Vue组件规则.md`](<../rulepacks/javascript/其他规则/16-Vue组件规则.md>) | `bc8713b0b57105a8eb3f89adc6946f06a0bbf02b53c2ec9dfa3eca8b692d69b2` | — | — |
| [`rulepacks/pico/PICO Unity SDK.md`](<../rulepacks/pico/PICO Unity SDK.md>) | `04fe4892afa1719e1c9af3b2db80ed36b64649fe7e3cd390c2c7524bf429ff3b` | — | developer.picoxr.com, docs.unity3d.com |
| [`rulepacks/project-docs/go/其他规则/00-Go技术文档编写规范总览.md`](<../rulepacks/project-docs/go/其他规则/00-Go技术文档编写规范总览.md>) | `71e4137493eaf4afb7bf1868e72358f409b6d440cdb0b4d5212c03d557ecbe23` | — | — |
| [`rulepacks/project-docs/go/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/go/其他规则/01-技术文档组织与维护规范.md>) | `c8cd3c292a83c9c637f0a967df063fe1149ca2195fc90a3f3575ff6d45c415b8` | — | — |
| [`rulepacks/project-docs/go/其他规则/02-Go技术文档编写规范.md`](<../rulepacks/project-docs/go/其他规则/02-Go技术文档编写规范.md>) | `833e2b6078d4828d5bbfce5d2dbc19ebaa5bb335e1bf8e43f7cd374d8b8770b5` | — | — |
| [`rulepacks/project-docs/go/其他规则/03-Go技术文档模板.md`](<../rulepacks/project-docs/go/其他规则/03-Go技术文档模板.md>) | `62095c857ad64536a5e7630479dde6509669e0b8f8bf3c30aa216102d4df30db` | — | — |
| [`rulepacks/project-docs/go/其他规则/04-GoAI技术文档任务入口.md`](<../rulepacks/project-docs/go/其他规则/04-GoAI技术文档任务入口.md>) | `27a98a2ec8de8c84aa1f55344fd35a4e08bb82601668cf9ae0efedc7857a369d` | — | — |
| [`rulepacks/project-docs/java/其他规则/00-Java技术文档编写规范总览.md`](<../rulepacks/project-docs/java/其他规则/00-Java技术文档编写规范总览.md>) | `05d40bfbd3a7ce05b18b618206003f6a962cc05b5933329c47c8928562d2d88b` | — | — |
| [`rulepacks/project-docs/java/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/java/其他规则/01-技术文档组织与维护规范.md>) | `daab2b63939f8fac6263bf6c1ad35a5e5f1ed8c38827d48c92e60da5e671234b` | — | — |
| [`rulepacks/project-docs/java/其他规则/02-Java技术文档编写规范.md`](<../rulepacks/project-docs/java/其他规则/02-Java技术文档编写规范.md>) | `c711dea83c3f1816b9bcd47a077c58f0c0a30b20cd70cf63bda1afad23b50e75` | — | — |
| [`rulepacks/project-docs/java/其他规则/03-Java技术文档模板.md`](<../rulepacks/project-docs/java/其他规则/03-Java技术文档模板.md>) | `facbf5497f4d5e7547c3c5244cb32168538b3e06192c59e10261e7a856117b07` | — | — |
| [`rulepacks/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md`](<../rulepacks/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md>) | `928e74759cd653236bfa47d9fac715cd2ee0c145fc7fb876131c001f1dba3fdf` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/00-JS+TS技术文档编写规范总览.md`](<../rulepacks/project-docs/js-ts/其他规则/00-JS+TS技术文档编写规范总览.md>) | `e1cb381e97d40ec9c908eb06dfd17b46b579002622a8e7a2c9d4f370ea48a73e` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md>) | `c84597624e92dbf40282ee3965d31b0b259d10cf4b34eba96edd7e1fd6dcc214` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/02-JS+TS技术文档编写规范.md`](<../rulepacks/project-docs/js-ts/其他规则/02-JS+TS技术文档编写规范.md>) | `37b6d1359e6a83861cc824ee5558e58f2b4341f4a38f432f3f678ae7161b0ca3` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/03-JS+TS技术文档模板.md`](<../rulepacks/project-docs/js-ts/其他规则/03-JS+TS技术文档模板.md>) | `764a374dabb6536da49d943bee65c43e90eb668047ba19332f0dc79a36e079f2` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md`](<../rulepacks/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md>) | `270686084f905bb7f476c5bf5d189489e9f7092a360a262c310704127893f2f7` | — | — |
| [`rulepacks/project-docs/python/其他规则/00-Python技术文档编写规范总览.md`](<../rulepacks/project-docs/python/其他规则/00-Python技术文档编写规范总览.md>) | `618a139105f49993646fd8ae33795c6684fed655b219677be91458dd528b235e` | — | — |
| [`rulepacks/project-docs/python/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/python/其他规则/01-技术文档组织与维护规范.md>) | `a34588e859f459514c63d47d7ce2d4de39a3c109444e8887f7d318d9f95be63f` | — | — |
| [`rulepacks/project-docs/python/其他规则/02-Python技术文档编写规范.md`](<../rulepacks/project-docs/python/其他规则/02-Python技术文档编写规范.md>) | `79781e04c90bc8be7f3f722453d7b02b96738a8370d5747f008c1e40a42cbcdb` | — | — |
| [`rulepacks/project-docs/python/其他规则/03-Python技术文档模板.md`](<../rulepacks/project-docs/python/其他规则/03-Python技术文档模板.md>) | `8cb66434f6e0c2ccd1268ac860e75576f03bb03d12429930152c454cf5c729be` | — | — |
| [`rulepacks/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md`](<../rulepacks/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md>) | `e65d2ad036509d955a39b701b33aab893db3ae92872b9070aa0638e240d4a72f` | — | — |
| [`rulepacks/project-docs/unity/其他规则/00-Unity技术文档编写规范总览.md`](<../rulepacks/project-docs/unity/其他规则/00-Unity技术文档编写规范总览.md>) | `12be36e15102279ff119e71fadbad7d3b92233442d32d39daed2751b8c7060db` | — | — |
| [`rulepacks/project-docs/unity/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/unity/其他规则/01-技术文档组织与维护规范.md>) | `40b1506e9408b0c273a838c6a2076a003de6a09e61bba9e2bd90cf0b0cc03c03` | — | — |
| [`rulepacks/project-docs/unity/其他规则/02-Unity技术文档编写规范.md`](<../rulepacks/project-docs/unity/其他规则/02-Unity技术文档编写规范.md>) | `b06b1befe353dedbe8cbc9792f5912f611452b982ef3fabead0448722243bff1` | — | — |
| [`rulepacks/project-docs/unity/其他规则/03-Unity技术文档模板.md`](<../rulepacks/project-docs/unity/其他规则/03-Unity技术文档模板.md>) | `e4bf9931649c36d0904d458ce05ed245a6f03702b28115d3a6e7dfe69d50d466` | — | — |
| [`rulepacks/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md`](<../rulepacks/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md>) | `2dc571151e9c1dfcfeb821b896aa81ae93b0ca3c13161db777d7f4a4691a6952` | — | — |
| [`rulepacks/python/00-文档总览.md`](<../rulepacks/python/00-文档总览.md>) | `4125e00577bda86db6b80748c7bd211b4cc00eed65be09b3e263537a44eb64d9` | — | — |
| [`rulepacks/python/14-AI通用入口规则.md`](<../rulepacks/python/14-AI通用入口规则.md>) | `650485b8dce6a0ff0ca943281ca12d9c87aa88653dd10797686d4f350b4796ed` | — | — |
| [`rulepacks/python/其他规则/01-代码编写规则.md`](<../rulepacks/python/其他规则/01-代码编写规则.md>) | `52b257f95747b5f81ffc02dfbaaaa3a8d0ea0861e79bdc95dc971966a3c7c0c1` | — | — |
| [`rulepacks/python/其他规则/02-代码风格规则.md`](<../rulepacks/python/其他规则/02-代码风格规则.md>) | `a167b8e90d090b14f0be0aa137ce25c5f90954704f66f64570ced711e34a1c5e` | — | — |
| [`rulepacks/python/其他规则/03-异常处理规则.md`](<../rulepacks/python/其他规则/03-异常处理规则.md>) | `bd0acde36e0ede4fe78030c274432ff0432b6372a6d3ef31633fefd3bcb31db3` | — | — |
| [`rulepacks/python/其他规则/04-并发与异步规则.md`](<../rulepacks/python/其他规则/04-并发与异步规则.md>) | `4f8b15d64a8122ad3c7835f9ba74ff9cb1525c5a7eae7e273937c84fbeb19e32` | — | — |
| [`rulepacks/python/其他规则/05-模式设计规则.md`](<../rulepacks/python/其他规则/05-模式设计规则.md>) | `d3938db8423a51ce31a949bdb3d4c31c9ab8e1aaab345f64be6af765669c33a0` | — | — |
| [`rulepacks/python/其他规则/06-Web-API设计规则.md`](<../rulepacks/python/其他规则/06-Web-API设计规则.md>) | `8618346710c5c5fdd28bcfc28dbe30b8887b4104d498f0a8469e5cb02968e519` | — | — |
| [`rulepacks/python/其他规则/07-数据访问规则.md`](<../rulepacks/python/其他规则/07-数据访问规则.md>) | `f1dbd3752e407c69c8daf6807956cd659ce4e84fa9a34c1bb5b6913066df80be` | — | — |
| [`rulepacks/python/其他规则/08-测试规则.md`](<../rulepacks/python/其他规则/08-测试规则.md>) | `eeed89f540f14b4b09e8bd2f847a5a09f9f833c69373a9ab79ce396bc234f89a` | — | — |
| [`rulepacks/python/其他规则/09-日志调试规则.md`](<../rulepacks/python/其他规则/09-日志调试规则.md>) | `a3ea293d66928f780f93c34da49ce0514081e0c3f8c104e942f8f489abdcde86` | — | — |
| [`rulepacks/python/其他规则/10-版本控制规则.md`](<../rulepacks/python/其他规则/10-版本控制规则.md>) | `6a63c0c59ba761be56cf814f03dcd7a0332c9f2b6359f3fbb5bf8045e187fcb2` | — | — |
| [`rulepacks/python/其他规则/11-性能优化规则.md`](<../rulepacks/python/其他规则/11-性能优化规则.md>) | `7b4299e825fddd23d2e211f88c45b7d039f1752bb09dd7b36babb2af09d983fd` | — | — |
| [`rulepacks/python/其他规则/12-安全规则.md`](<../rulepacks/python/其他规则/12-安全规则.md>) | `731e9412581d7b6c813fbaf424bfcfc8beec6d3490e05a9cd5d9e500e5c805b3` | — | — |
| [`rulepacks/python/其他规则/13-部署运维规则.md`](<../rulepacks/python/其他规则/13-部署运维规则.md>) | `bcdba313d811927f838965304902b20a7327b4965a4a18aae11d5c17b5ad3052` | — | — |
| [`rulepacks/rule-authoring/规则文档编写格式规范.md`](<../rulepacks/rule-authoring/规则文档编写格式规范.md>) | `d763783a806fa76a4331a07a13d4b8733e5b2673549b813f4cc2af096562c501` | — | — |
| [`rulepacks/typescript/00-文档总览.md`](<../rulepacks/typescript/00-文档总览.md>) | `c0aa85f3b564cf0d771362ce738ecb7f652037b2ba4f2a08d50cb470fe0999a2` | — | — |
| [`rulepacks/typescript/09-AI通用入口规则.md`](<../rulepacks/typescript/09-AI通用入口规则.md>) | `e9b5335f83a47c92c57e25314e22bfe201efed0bf79def09d6fd42c1754a2ebf` | — | — |
| [`rulepacks/typescript/其他规则/01-类型系统.md`](<../rulepacks/typescript/其他规则/01-类型系统.md>) | `3a0ce8c5fffde3d70f47c3b418538231157dd935c4f6831dcca599b84c233af0` | — | ..., api.example.com |
| [`rulepacks/typescript/其他规则/02-类型守卫与收窄.md`](<../rulepacks/typescript/其他规则/02-类型守卫与收窄.md>) | `7c8e7ea3a27904aab9721d5cdbd9df4ae8676c4d138116b7ae6dbfb6bb954718` | — | — |
| [`rulepacks/typescript/其他规则/03-TS 独有与 JS 差异.md`](<../rulepacks/typescript/其他规则/03-TS 独有与 JS 差异.md>) | `36bf4e0de5ae1f43817042c6f703575789d77c1cea4360e4485e12c1259006f2` | — | — |
| [`rulepacks/typescript/其他规则/04-高级类型.md`](<../rulepacks/typescript/其他规则/04-高级类型.md>) | `78f56d5ebd4aa0bce190d75968eb6111fe17da459cf24918524bc0815d0c8cc2` | — | — |
| [`rulepacks/typescript/其他规则/05-声明文件.md`](<../rulepacks/typescript/其他规则/05-声明文件.md>) | `8eef4746b395469ece6c4f67d0692feadd2abe3e35a784483521990496fe8f74` | — | — |
| [`rulepacks/typescript/其他规则/06-tsconfig 严格度.md`](<../rulepacks/typescript/其他规则/06-tsconfig 严格度.md>) | `f57074a42c315007c664973b376755619038a35fca6ebf226994f4f39c2c3aa8` | — | — |
| [`rulepacks/typescript/其他规则/07-ESLint + Prettier TS 集成.md`](<../rulepacks/typescript/其他规则/07-ESLint + Prettier TS 集成.md>) | `7ac46ba25e67ca6148fcd1527e10802ec09e6c340fc4f1aef85e082570b601de` | — | — |
| [`rulepacks/typescript/其他规则/08-常见反模式与 AI 自检.md`](<../rulepacks/typescript/其他规则/08-常见反模式与 AI 自检.md>) | `d67eb001ff78547a5493bda16c9203312cf15a8a4203b24b4e4c1c2247325870` | — | — |
| [`rulepacks/unity/00-文档总览.md`](<../rulepacks/unity/00-文档总览.md>) | `970e37d161918add6c1153c88ea619d5162fe28fd015f643e9607832b36c7b6a` | — | — |
| [`rulepacks/unity/15-AI通用入口规则.md`](<../rulepacks/unity/15-AI通用入口规则.md>) | `08840facbce7e5cb813ec6ee7673f9780058a615488330ee002444a523f8f974` | — | — |
| [`rulepacks/unity/其他规则/01-代码编写规则.md`](<../rulepacks/unity/其他规则/01-代码编写规则.md>) | `076ad851be50a4061fe7984dd1019457b64926ae09755a4bed9d3e88843114c8` | — | — |
| [`rulepacks/unity/其他规则/02-模式设计规则.md`](<../rulepacks/unity/其他规则/02-模式设计规则.md>) | `408a459158c1fa1a0431ebee0c4b562f30849b882866d5c13d2fe9fd59a3d8a5` | — | — |
| [`rulepacks/unity/其他规则/03-性能优化规则.md`](<../rulepacks/unity/其他规则/03-性能优化规则.md>) | `88f95f62a12538c9d02db9c3a3fc0b65150d7169a09a7aab2b8b034ce4f56717` | — | — |
| [`rulepacks/unity/其他规则/04-UGUI设计规则.md`](<../rulepacks/unity/其他规则/04-UGUI设计规则.md>) | `52885662d62eabe85ff33b5af9886a95c7c54f507512186aa147484d0fdaa986` | — | — |
| [`rulepacks/unity/其他规则/05-UI Toolkit设计规则.md`](<../rulepacks/unity/其他规则/05-UI Toolkit设计规则.md>) | `4f9691c5f6cc2c1c244a169dbd1baa5de97c3f602a53be9970525d6649c81cfa` | — | docs.unity3d.com |
| [`rulepacks/unity/其他规则/06-项目配置规则.md`](<../rulepacks/unity/其他规则/06-项目配置规则.md>) | `3d7e7b16ea08bb77f9dce899ca202f7dc75f8ec10cf85347b064ed6d4495973a` | — | — |
| [`rulepacks/unity/其他规则/07-日志调试规则.md`](<../rulepacks/unity/其他规则/07-日志调试规则.md>) | `d6fafc6399e6525d25d4bc674059cc2e134e867b526ee422008f9438f1cc7103` | — | — |
| [`rulepacks/unity/其他规则/08-版本控制规则.md`](<../rulepacks/unity/其他规则/08-版本控制规则.md>) | `28c9dbd97a5871ca14b16ffbeb89d201bac05d73f582603957d26e1e60483855` | — | github.com |
| [`rulepacks/unity/其他规则/09-资源管理规则.md`](<../rulepacks/unity/其他规则/09-资源管理规则.md>) | `239e313efac6dfc8c8c745b2de1a6195bb0f1bd47a32865d5fc7b16d04dc76cf` | — | — |
| [`rulepacks/unity/其他规则/10-代码风格规则.md`](<../rulepacks/unity/其他规则/10-代码风格规则.md>) | `71c88fc77fdd1ea867776ed4231cc28635068b9a5bf408b4c642bb59e8a37124` | — | — |
| [`rulepacks/unity/其他规则/11-扩展编辑器规则.md`](<../rulepacks/unity/其他规则/11-扩展编辑器规则.md>) | `9a8b5bb88cfe153ffe4d41d40983dfe3d2dce70b66f1f8709dbed5c22179e363` | — | — |
| [`rulepacks/unity/其他规则/12-网络模块规则.md`](<../rulepacks/unity/其他规则/12-网络模块规则.md>) | `593424cf6ce13e995692f17e5aa9ddd427b4abec70899aa043c8701aa3694e32` | — | api.example.com |
| [`rulepacks/unity/其他规则/13-服务端模块规则.md`](<../rulepacks/unity/其他规则/13-服务端模块规则.md>) | `567e18e8bd317208d9569decd5cad0221c1d0c0df813cd6708f709775f5e45a9` | — | — |
| [`rulepacks/unity/其他规则/14-安全模块规则.md`](<../rulepacks/unity/其他规则/14-安全模块规则.md>) | `d6a91915a2c88c17130545de3147240a23a555019dcbfcaf5a32b9ed88802f17` | — | — |
| [`rulepacks/unity/其他规则/16-问题定位与根因确认规则.md`](<../rulepacks/unity/其他规则/16-问题定位与根因确认规则.md>) | `eefc1e9a1362963f85ce15b5a5906e880faa5dc253db7b19d653edd91fcdd811` | — | — |
