# 规则包内容来源逐文件清单

本清单由 `node scripts/generate-provenance-inventory.mjs --write` 从当前 `rulepacks/` 清单和文件内容生成；CI 用 `--check` 检查同步。SHA-256 按 CRLF 转 LF 后的文本计算，以便跨平台复核。它只提供人工复核线索，不判断原创性、许可或公开权限。文件内容变化会改变摘要；已完成的人工授权记录必须针对变更重新核对。`archive/legacy-rules/` 需单独审查。

当前纳入 14 个规则包、116 份 Markdown；3 份包含明确的来源措辞线索，24 份含外部 URL。没有线索或外链不代表内容由本仓库原创；有外链也不代表正文来自该网站。

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
| [`rulepacks/common/entry.md`](<../rulepacks/common/entry.md>) | `1d368a68ad011d4c5c72831a707be90743ace1a0b2bc0bbe4bb81fc6353cc46b` | — | — |
| [`rulepacks/go/00-文档总览.md`](<../rulepacks/go/00-文档总览.md>) | `9c29814361d57ce33005db864f9b35b1b076cde8ec8198bc72a54e473b9ba5eb` | L115 | github.com |
| [`rulepacks/go/13-AI通用入口规则.md`](<../rulepacks/go/13-AI通用入口规则.md>) | `261175f49ca34786a80b4d245ab053910b999d2a5d31a70c3456c800da6e6382` | — | — |
| [`rulepacks/go/其他规则/01-代码编写规则.md`](<../rulepacks/go/其他规则/01-代码编写规则.md>) | `4c541402bb4f5a31131cbd91cc5c7f642047e41c960edf7bdb4a3acf814d28d7` | — | pkg.go.dev |
| [`rulepacks/go/其他规则/02-模式设计.md`](<../rulepacks/go/其他规则/02-模式设计.md>) | `7e911ea20f92cbb618cbfc06f2ef5a1ee3b01c94bd641d454ef1e19861e296e2` | — | github.com |
| [`rulepacks/go/其他规则/03-性能优化.md`](<../rulepacks/go/其他规则/03-性能优化.md>) | `2e9b8225813a99af5af074a47dbf27a1036036d9536c087078dd4a38990be759` | — | go.dev |
| [`rulepacks/go/其他规则/04-API设计规则.md`](<../rulepacks/go/其他规则/04-API设计规则.md>) | `bbfe85df66dddf98390c56ceff7d45af4f84291535a2cf0c1a61d0dcc1f8e307` | L121 | github.com |
| [`rulepacks/go/其他规则/05-数据库与持久化.md`](<../rulepacks/go/其他规则/05-数据库与持久化.md>) | `303b807bb4e834efedd032000319e1206b1f47fd46bd3aacbbb9ac535b8137a3` | — | atlasgo.io, github.com, pkg.go.dev |
| [`rulepacks/go/其他规则/06-项目配置规则.md`](<../rulepacks/go/其他规则/06-项目配置规则.md>) | `60f826dcf6f53b60799a3af4905d73278e9ae602f0b5ee04cd6f0326af7ebab8` | — | github.com |
| [`rulepacks/go/其他规则/07-日志调试规则.md`](<../rulepacks/go/其他规则/07-日志调试规则.md>) | `3a05104889258fac50893d9582f0bc048c034158f3f0e23e21372850daf97c0c` | — | — |
| [`rulepacks/go/其他规则/08-版本控制规则.md`](<../rulepacks/go/其他规则/08-版本控制规则.md>) | `7c9beb4cd7f9ef0f3d855c0c512cd49012d8b53d96d0e9e91cd5927f932b3869` | — | semver.org |
| [`rulepacks/go/其他规则/09-依赖与构建.md`](<../rulepacks/go/其他规则/09-依赖与构建.md>) | `501f1e1f44fc980b6eebcfbadb17b87c1c82048ed44c009437bb4910f021979c` | — | semver.org |
| [`rulepacks/go/其他规则/10-代码风格规则.md`](<../rulepacks/go/其他规则/10-代码风格规则.md>) | `7d2503022943a77cc0773ed76336a17eed4bed9902dcbb265fe72ae30bf45a2e` | — | golangci-lint.run |
| [`rulepacks/go/其他规则/11-测试与可观测性.md`](<../rulepacks/go/其他规则/11-测试与可观测性.md>) | `87b6c2f77246c40be005be4867b6354470a59fba0eba9a825e8ae9665763247c` | — | prometheus.io |
| [`rulepacks/go/其他规则/12-安全规则.md`](<../rulepacks/go/其他规则/12-安全规则.md>) | `8be05382160aff6aacdde1294587c4cbac8b4d679279540ac1ff74d1bc3909cf` | — | 169.254.169.254, admin.example.com, app.example.com, owasp.org |
| [`rulepacks/java/00-文档总览.md`](<../rulepacks/java/00-文档总览.md>) | `e6a5d47c7515d8175d5aa7b43b6f340478758cecd2c4443a211cdd12f22492af` | L128 | github.com |
| [`rulepacks/java/14-AI通用入口规则.md`](<../rulepacks/java/14-AI通用入口规则.md>) | `7082753eee65742c485d57c9c23700e0c2d73917a118e56045ba9452d667c1f5` | — | — |
| [`rulepacks/java/其他规则/01-代码编写规则.md`](<../rulepacks/java/其他规则/01-代码编写规则.md>) | `3332a47e78f3fbb8ddf0a51ef258bb9e441f84601ae897d6bbe6ddf5b70d80ee` | — | — |
| [`rulepacks/java/其他规则/02-代码风格规则.md`](<../rulepacks/java/其他规则/02-代码风格规则.md>) | `66f752d20e30d2a96b97a4953f39b0d0bc7c5d6259eedf5da46b12e0907c97e1` | — | checkstyle.org |
| [`rulepacks/java/其他规则/03-异常处理规则.md`](<../rulepacks/java/其他规则/03-异常处理规则.md>) | `b47394ad929b256841ad6a969ed85b227afd40b13fbf1ae01b93da103ce893c0` | — | — |
| [`rulepacks/java/其他规则/04-并发编程规则.md`](<../rulepacks/java/其他规则/04-并发编程规则.md>) | `9696bd80dd1e411057604f382ff6ed5f13a65f08aec69e65838855ff79060dea` | — | — |
| [`rulepacks/java/其他规则/05-模式设计规则.md`](<../rulepacks/java/其他规则/05-模式设计规则.md>) | `ea0fc6b3af955552d94873877c95160f0507d83687f3b7681d7db7284794aa13` | — | — |
| [`rulepacks/java/其他规则/06-Web-API设计规则.md`](<../rulepacks/java/其他规则/06-Web-API设计规则.md>) | `a51e96d0bc0b1a94fd621b2170a6541781a86371a993ab9c713ec803ccdb8d62` | — | app.example.com |
| [`rulepacks/java/其他规则/07-数据访问规则.md`](<../rulepacks/java/其他规则/07-数据访问规则.md>) | `7c81021b1eec4767e236b7b8b6415be9bfd4e79836b68631a243663c78a88cb5` | — | — |
| [`rulepacks/java/其他规则/08-测试规则.md`](<../rulepacks/java/其他规则/08-测试规则.md>) | `ea17a1dbd911252e68229fddd12f816e50d2544a4da73a0b9f8880045a8ac4fd` | — | — |
| [`rulepacks/java/其他规则/09-日志调试规则.md`](<../rulepacks/java/其他规则/09-日志调试规则.md>) | `42a853079e07beaa2fb420aa58027e9a3439bef095689bdea0ba698626781d1f` | — | — |
| [`rulepacks/java/其他规则/10-版本控制规则.md`](<../rulepacks/java/其他规则/10-版本控制规则.md>) | `c30dbc64495c0d851e31ff0edecdc014a1ed4f9c19d04a99bd0517c69431f6a9` | — | — |
| [`rulepacks/java/其他规则/11-性能优化规则.md`](<../rulepacks/java/其他规则/11-性能优化规则.md>) | `f192581348949a70bebcc42508498dfd9386c2bcd748fc02088569da56978540` | — | arthas.aliyun.com |
| [`rulepacks/java/其他规则/12-安全规则.md`](<../rulepacks/java/其他规则/12-安全规则.md>) | `66780dc2bcfac2b56baabf41531cbbae7e3a6592959a41652e21ce692b325459` | — | 169.254.169.254, admin.example.com, app.example.com, github.com, xn--`-h47aw02l |
| [`rulepacks/java/其他规则/13-部署运维规则.md`](<../rulepacks/java/其他规则/13-部署运维规则.md>) | `c7447d0666666b9e23eb4f8ac22f378739c9a3a54057ff856c86ec75373f73a5` | — | — |
| [`rulepacks/javascript/00-文档总览.md`](<../rulepacks/javascript/00-文档总览.md>) | `9f555d3751e65dda132bc103874fcb4f208f5aba0155952d8583c3a5e2aefb65` | — | — |
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
| [`rulepacks/project-docs/go/其他规则/00-Go技术文档编写规范总览.md`](<../rulepacks/project-docs/go/其他规则/00-Go技术文档编写规范总览.md>) | `72775df84d6600bcd7ed9c775f652ac894900693111a1c9562ff95be9e4ddded` | — | — |
| [`rulepacks/project-docs/go/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/go/其他规则/01-技术文档组织与维护规范.md>) | `08060bcf23eb57f11445da78fa6bdf88ead750758d0d351e1211b6f1f1405f58` | — | — |
| [`rulepacks/project-docs/go/其他规则/02-Go技术文档编写规范.md`](<../rulepacks/project-docs/go/其他规则/02-Go技术文档编写规范.md>) | `5d72129c41228bef5d94e42c20d024387715c8388698386a7b01666bf2c472a2` | — | — |
| [`rulepacks/project-docs/go/其他规则/03-Go技术文档模板.md`](<../rulepacks/project-docs/go/其他规则/03-Go技术文档模板.md>) | `db6fb6bfcac1be238f6366ab2e54441747ba460a3f2b866b7e4228e200e00095` | — | — |
| [`rulepacks/project-docs/go/其他规则/04-GoAI技术文档任务入口.md`](<../rulepacks/project-docs/go/其他规则/04-GoAI技术文档任务入口.md>) | `cdc5df9ed532529a21066980590f28c1772f30d97c5eb7411f5e3189666c794c` | — | — |
| [`rulepacks/project-docs/java/其他规则/00-Java技术文档编写规范总览.md`](<../rulepacks/project-docs/java/其他规则/00-Java技术文档编写规范总览.md>) | `bd202633205e10206f2923272e09e5a1274bb6817f5671a4989f9a3b0b40bfa3` | — | — |
| [`rulepacks/project-docs/java/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/java/其他规则/01-技术文档组织与维护规范.md>) | `700db46aae3c97152491f49efb3c8a5e6e32152bf85633d75bd2f001ddec29ba` | — | — |
| [`rulepacks/project-docs/java/其他规则/02-Java技术文档编写规范.md`](<../rulepacks/project-docs/java/其他规则/02-Java技术文档编写规范.md>) | `b32fddca0290798bc14854f285208f653931a29c513b57ae1a35f3eb77d396d4` | — | — |
| [`rulepacks/project-docs/java/其他规则/03-Java技术文档模板.md`](<../rulepacks/project-docs/java/其他规则/03-Java技术文档模板.md>) | `7267da72293f3cdd38a7cf77b59b1cbc6225376f2fe65a6b49c5f585c1495a2d` | — | — |
| [`rulepacks/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md`](<../rulepacks/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md>) | `acfd11a4643286d3892eaaec46cbb3f6c988f60aa80f57e1a3c2b1d36f1c74e2` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/00-JS+TS技术文档编写规范总览.md`](<../rulepacks/project-docs/js-ts/其他规则/00-JS+TS技术文档编写规范总览.md>) | `f1510e770dc3bbfcebf25bedb76e6e44556a766fc6b50e8d84849fec233058f6` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md>) | `077c53d9e6f7798ebaae745314357fd0b5a4161fa0062b666104167a82fdba82` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/02-JS+TS技术文档编写规范.md`](<../rulepacks/project-docs/js-ts/其他规则/02-JS+TS技术文档编写规范.md>) | `a3336664bced1c997bf419fd8cc627cb02f65c2ba946c7b989b075b8dd2860bf` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/03-JS+TS技术文档模板.md`](<../rulepacks/project-docs/js-ts/其他规则/03-JS+TS技术文档模板.md>) | `bdcabdf176e53cb81c3b8c94c2ae79f8e34446e454365932d6e411fdc8757170` | — | — |
| [`rulepacks/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md`](<../rulepacks/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md>) | `46d8dad09ad5d09cf08ced20b4d0dffa907229925f92f13ccaae494b7322f0c7` | — | — |
| [`rulepacks/project-docs/python/其他规则/00-Python技术文档编写规范总览.md`](<../rulepacks/project-docs/python/其他规则/00-Python技术文档编写规范总览.md>) | `2234011ec394bc700ddb2a41d9462a6b7a488bfcfddc99f7ba469467a2a49a79` | — | — |
| [`rulepacks/project-docs/python/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/python/其他规则/01-技术文档组织与维护规范.md>) | `f507d3ba394d40150a0b9acd1294d98a908d6d3b2ff6bac4969f4e780f183aa9` | — | — |
| [`rulepacks/project-docs/python/其他规则/02-Python技术文档编写规范.md`](<../rulepacks/project-docs/python/其他规则/02-Python技术文档编写规范.md>) | `fdf8685274fd86f5e66d561aa079f63ad0eb431077097e0f48eb8cbf142f107f` | — | — |
| [`rulepacks/project-docs/python/其他规则/03-Python技术文档模板.md`](<../rulepacks/project-docs/python/其他规则/03-Python技术文档模板.md>) | `27fc92525bfe2809364ec6cb0fd8e7c793a7a20d69e2dae2f6622947d302da85` | — | — |
| [`rulepacks/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md`](<../rulepacks/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md>) | `ab4f9597a8717360f77ada610c577a94def2dd42f2ff67ed37097f4a63582610` | — | — |
| [`rulepacks/project-docs/unity/其他规则/00-Unity技术文档编写规范总览.md`](<../rulepacks/project-docs/unity/其他规则/00-Unity技术文档编写规范总览.md>) | `5da8f02214755c39f841c3e59c4c11bb27691b2378dc447c58fcccf73dbcc4ae` | — | — |
| [`rulepacks/project-docs/unity/其他规则/01-技术文档组织与维护规范.md`](<../rulepacks/project-docs/unity/其他规则/01-技术文档组织与维护规范.md>) | `5fa770b1d16160df8e3c52b7e263c377b42a31fd59f04ec38a9e92841662a6d4` | — | — |
| [`rulepacks/project-docs/unity/其他规则/02-Unity技术文档编写规范.md`](<../rulepacks/project-docs/unity/其他规则/02-Unity技术文档编写规范.md>) | `2426e7b3b9ba56be1793c8e1f76f639d8afc202b537806ed37d6fff4669c8ac0` | — | — |
| [`rulepacks/project-docs/unity/其他规则/03-Unity技术文档模板.md`](<../rulepacks/project-docs/unity/其他规则/03-Unity技术文档模板.md>) | `af128d28ed8babc63175604ba847854638add67882438b0505c526bb94e41066` | — | — |
| [`rulepacks/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md`](<../rulepacks/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md>) | `ce051f5b1f39a0e2b39132c132d4400fcc62e4eb8db361b8b70ef564973a9cde` | — | — |
| [`rulepacks/python/00-文档总览.md`](<../rulepacks/python/00-文档总览.md>) | `5b61333a87bb22d05e9fd46f33aaed9bfa961fabd5a22803562e0661200f7532` | — | — |
| [`rulepacks/python/14-AI通用入口规则.md`](<../rulepacks/python/14-AI通用入口规则.md>) | `a1f5ca437088a19ae411f442829088ba6a9b01cec4914d32f9d62865bb4e4d55` | — | — |
| [`rulepacks/python/其他规则/01-代码编写规则.md`](<../rulepacks/python/其他规则/01-代码编写规则.md>) | `addb36d3cc585ceb1162155b3796cb66cb561202a6284da9dba1d626bed9f909` | — | — |
| [`rulepacks/python/其他规则/02-代码风格规则.md`](<../rulepacks/python/其他规则/02-代码风格规则.md>) | `c636a60bcb752f9263250bf775cad08d6b055e757db24cdba90cf2f343908a3a` | — | — |
| [`rulepacks/python/其他规则/03-异常处理规则.md`](<../rulepacks/python/其他规则/03-异常处理规则.md>) | `d615616397c604d1b07c84eac95cf76459baa172828413f97301314ae9d41a89` | — | — |
| [`rulepacks/python/其他规则/04-并发与异步规则.md`](<../rulepacks/python/其他规则/04-并发与异步规则.md>) | `cfd3bed6a080239cd35c82df216a1e2017fffe370d8d813bd65f6ea5549a0245` | — | — |
| [`rulepacks/python/其他规则/05-模式设计规则.md`](<../rulepacks/python/其他规则/05-模式设计规则.md>) | `d2b69972ca329af097ba3ae1755b69c2855a38fd33f195f5b920b189dd66a394` | — | — |
| [`rulepacks/python/其他规则/06-Web-API设计规则.md`](<../rulepacks/python/其他规则/06-Web-API设计规则.md>) | `ab925e2f75654d0e8747bfb07f7795642e164336ca5cfbe4d1e939e3556fb62c` | — | — |
| [`rulepacks/python/其他规则/07-数据访问规则.md`](<../rulepacks/python/其他规则/07-数据访问规则.md>) | `de75f04568a26b34356fbffe231bfed958a0799c3764e827c09423b12ed4d548` | — | — |
| [`rulepacks/python/其他规则/08-测试规则.md`](<../rulepacks/python/其他规则/08-测试规则.md>) | `a55718c81966a497e8cc0286496b8c3798c90104c16099bf3af98895eee7975b` | — | — |
| [`rulepacks/python/其他规则/09-日志调试规则.md`](<../rulepacks/python/其他规则/09-日志调试规则.md>) | `e824458bf560cd8aeced188937302cc662e6104f7f76d372e832c35bfade5ffc` | — | — |
| [`rulepacks/python/其他规则/10-版本控制规则.md`](<../rulepacks/python/其他规则/10-版本控制规则.md>) | `b1f8e23a1048e1dc947f0650ead9c27f6d9774cba8845ba3b8bd9af46e54d5b7` | — | — |
| [`rulepacks/python/其他规则/11-性能优化规则.md`](<../rulepacks/python/其他规则/11-性能优化规则.md>) | `c8aa35b12fce68c55a402130acfa2102771e55eab549209a42880ee1a670ee42` | — | — |
| [`rulepacks/python/其他规则/12-安全规则.md`](<../rulepacks/python/其他规则/12-安全规则.md>) | `9dd846d6ebe1cf914c029e4f43f24e5203e6b4f2ac97fdda58a0b6e470ea5aec` | — | — |
| [`rulepacks/python/其他规则/13-部署运维规则.md`](<../rulepacks/python/其他规则/13-部署运维规则.md>) | `dc1da064d0e21f4006592b5d15158f51e4067a8aba115b6d953abb440dc28859` | — | — |
| [`rulepacks/rule-authoring/规则文档编写格式规范.md`](<../rulepacks/rule-authoring/规则文档编写格式规范.md>) | `d763783a806fa76a4331a07a13d4b8733e5b2673549b813f4cc2af096562c501` | — | — |
| [`rulepacks/typescript/00-文档总览.md`](<../rulepacks/typescript/00-文档总览.md>) | `2c55f9773a854ee2b5390b89674db2d17d1a2d0e1441b21cdb0207dc7c59f086` | — | — |
| [`rulepacks/typescript/09-AI通用入口规则.md`](<../rulepacks/typescript/09-AI通用入口规则.md>) | `e9b5335f83a47c92c57e25314e22bfe201efed0bf79def09d6fd42c1754a2ebf` | — | — |
| [`rulepacks/typescript/其他规则/01-类型系统.md`](<../rulepacks/typescript/其他规则/01-类型系统.md>) | `3a0ce8c5fffde3d70f47c3b418538231157dd935c4f6831dcca599b84c233af0` | — | ..., api.example.com |
| [`rulepacks/typescript/其他规则/02-类型守卫与收窄.md`](<../rulepacks/typescript/其他规则/02-类型守卫与收窄.md>) | `7c8e7ea3a27904aab9721d5cdbd9df4ae8676c4d138116b7ae6dbfb6bb954718` | — | — |
| [`rulepacks/typescript/其他规则/03-TS 独有与 JS 差异.md`](<../rulepacks/typescript/其他规则/03-TS 独有与 JS 差异.md>) | `36bf4e0de5ae1f43817042c6f703575789d77c1cea4360e4485e12c1259006f2` | — | — |
| [`rulepacks/typescript/其他规则/04-高级类型.md`](<../rulepacks/typescript/其他规则/04-高级类型.md>) | `78f56d5ebd4aa0bce190d75968eb6111fe17da459cf24918524bc0815d0c8cc2` | — | — |
| [`rulepacks/typescript/其他规则/05-声明文件.md`](<../rulepacks/typescript/其他规则/05-声明文件.md>) | `8eef4746b395469ece6c4f67d0692feadd2abe3e35a784483521990496fe8f74` | — | — |
| [`rulepacks/typescript/其他规则/06-tsconfig 严格度.md`](<../rulepacks/typescript/其他规则/06-tsconfig 严格度.md>) | `f57074a42c315007c664973b376755619038a35fca6ebf226994f4f39c2c3aa8` | — | — |
| [`rulepacks/typescript/其他规则/07-ESLint + Prettier TS 集成.md`](<../rulepacks/typescript/其他规则/07-ESLint + Prettier TS 集成.md>) | `7ac46ba25e67ca6148fcd1527e10802ec09e6c340fc4f1aef85e082570b601de` | — | — |
| [`rulepacks/typescript/其他规则/08-常见反模式与 AI 自检.md`](<../rulepacks/typescript/其他规则/08-常见反模式与 AI 自检.md>) | `d67eb001ff78547a5493bda16c9203312cf15a8a4203b24b4e4c1c2247325870` | — | — |
| [`rulepacks/unity/00-文档总览.md`](<../rulepacks/unity/00-文档总览.md>) | `4bff68b2ae3d7b2757708a59838b37d7bd032a82bf23be201553c5161f882a4a` | — | — |
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
