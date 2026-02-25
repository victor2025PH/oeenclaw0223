# 需要上传到 Git 的文件清单

把以下文件和目录纳入版本库并 push 到远程（如 `victor2025PH/oeenclaw0223`），以便服务器或其他 Cursor 通过 `git pull` 获取并部署。

## 一、必须包含（wecom-kefu 插件与文档）

```
extensions/wecom-kefu/
├── .gitignore
├── package.json
├── openclaw.plugin.json
├── index.ts
├── README.md
├── src/
│   ├── channel.ts
│   ├── config-schema.ts
│   ├── crypto.ts
│   ├── http-handler.ts
│   ├── kefu-api.ts
│   ├── outbound.ts
│   └── runtime.ts
```

```
WECOM_KEFU_SUMMARY_AND_NEXT_STEPS.md
WECOM_KEFU_DEV.md
```

## 二、可选（参考与说明）

```
reference-extensions/
├── README.md
├── openclaw-channels-sample.json
└── wecom/                    # 若已在仓库中可不再提交
INSTRUCTIONS_FOR_SERVER_CURSOR.md
DEPLOY_TO_SERVER_INSTRUCTIONS.md   # 给“另一个 Cursor”的部署步骤
```

## 三、若在已有 clone 中操作（本地或另一台机）

```bash
# 在仓库根目录
git add extensions/wecom-kefu/
git add WECOM_KEFU_SUMMARY_AND_NEXT_STEPS.md WECOM_KEFU_DEV.md
git add DEPLOY_TO_SERVER_INSTRUCTIONS.md GIT_UPLOAD_LIST.md
git add reference-extensions/README.md reference-extensions/openclaw-channels-sample.json
# 若 reference-extensions/wecom 已存在且最新，不必重复 add
git status
git commit -m "feat: add wecom-kefu channel plugin and deploy docs"
git push origin main
```

## 四、若当前目录不是 git 仓库

1. 在**已 clone 了 oeenclaw0223 的目录**中，把本工作区里上述文件/目录**拷贝过去**（覆盖或新增）。
2. 在该 clone 里执行上面的 `git add` / `commit` / `push`。
3. 或在本目录执行 `git init` 并 `git remote add origin https://github.com/victor2025PH/oeenclaw0223.git`，再 add/commit/push（注意是否会覆盖远程，建议在单独分支先 push）。
