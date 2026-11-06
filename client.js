/**
 * 干了么 (Git Pulse) — Client half.
 *
 * Registers a sidebar panel entry and the full-page dashboard it opens:
 *   - sidebar.panellist id `ganleme`  → the icon in the left rail
 *   - main key `ganleme`              → the dashboard page
 *
 * Data comes from the Host routes `/ganleme/repos` and `/ganleme/stats`
 * (browser-relative fetch, same origin). Reports are rendered client-side
 * from the stats payload as Markdown, with one-click copy.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ganleme',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'ganleme';
    const PANEL_ID = 'ganleme';
    const PACKAGE = 'dsh-ganleme';

    /** Simplified Chinese dictionary and key source of truth. */
    const zh = {
      panel: '干了么',
      title: '干了么',
      subtitle: '看看最近各仓库干了多少活',
      'range.today': '今天',
      'range.yesterday': '昨天',
      'range.week': '本周',
      'range.month': '本月',
      'range.custom': '自定义',
      'custom.from': '开始',
      'custom.to': '结束',
      'custom.last7': '近 7 天',
      'custom.last30': '近 30 天',
      'custom.lastWeek': '上周',
      'custom.lastMonth': '上月',
      'custom.errOrder': '开始日期不能晚于结束日期',
      'custom.errIncomplete': '请选择完整的开始和结束日期',
      'custom.errFuture': '不能选择今天之后的日期',
      'custom.errSpan': '范围不能超过 366 天',
      'report.range': '生成区间报告',
      'report.title.range': '工作报告',
      refresh: '刷新',
      loading: '正在统计…',
      'loading.2': '正在翻 git 账本…',
      'loading.3': '正在数你今天敲了多少行…',
      'loading.4': '小人趁机摸会儿鱼…',
      loadFailed: '统计失败',
      retry: '重试',
      'section.repos': '仓库明细',
      'stat.commits': '提交次数',
      'stat.additions': '新增行',
      'stat.deletions': '删除行',
      'stat.repos': '活跃仓库',
      'stat.files': '变更文件',
      'stat.authors': '活跃作者',
      'scope.all': '全部人',
      'scope.mine': '只看我',
      'repo.noIdentity': '未配置 git 身份',
      'repo.truncated': '可能不完整',
      'repo.truncatedHint': '读取的提交数达到 commitLimit 上限，较早的提交可能没有统计到。可在插件配置里调大 commitLimit。',
      'empty': '这段时间没有提交记录',
      'emptyHint': '在插件配置里添加 extraRoots 可以统计更多目录',
      'empty.mine': '没有识别到你的提交',
      'emptyHint.mine': '仓库的 git user.email 需要与你的一致；不同机器可在插件配置里设置 myEmail',
      'card.commits': '{n} 次提交',
      'source.workspace': '工作区',
      'source.extra': '额外',
      'authors.label': '作者',
      'authors.more': '等 {n} 人',
      'commits.more': '还有 {n} 条未展示',
      'report.daily': '生成日报',
      'report.dailyYesterday': '生成昨日日报',
      'report.weekly': '生成周报',
      'report.monthly': '生成月报',
      'report.title.daily': '日报',
      'report.title.weekly': '周报',
      'report.title.monthly': '月报',
      'report.rangeLabel': '统计范围',
      'report.format.markdown': 'Markdown',
      'report.format.plain': '纯文本',
      'report.overviewPlain': '一、总览',
      'report.detailPlain': '二、分仓库明细',
      'report.generating': '正在生成…',
      'report.failed': '生成失败',
      'report.copy': '复制全文',
      'report.copied': '已复制',
      'report.close': '关闭',
      'report.overview': '总览',
      'report.detail': '分仓库明细',
      'report.overviewBody': '本期共提交 {commits} 次，新增 {additions} 行，删除 {deletions} 行，涉及 {repos} 个仓库。',
      'report.overviewBodyNoLines': '本期共提交 {commits} 次，涉及 {repos} 个仓库。',
      'report.repoLine': '{commits} 次提交，新增 {additions} 行，删除 {deletions} 行',
      'report.repoLineNoLines': '{commits} 次提交',
      'report.emptyBody': '本期没有提交记录。',
      'report.errors': '无法统计的仓库',
      'report.noIdentityNote': '注意：以下仓库未配置 git 身份，你的提交无法识别，未计入：{repos}',
      'report.footer': '由 {app} 生成',
      'report.truncated': '（仅展示前 20 条）',
      'report.truncatedCount': '（还有 {n} 条未展示）',
      'report.style': '风格',
      'report.style.worklog': '工作清单',
      'report.style.worklog.hint': '每条只留做了什么，去掉类型前缀、时间和行数',
      'report.style.brief': '简洁',
      'report.style.brief.hint': '工作清单，附每个仓库的提交次数',
      'report.style.standard': '标准',
      'report.style.standard.hint': '带时间、分支和统计行',
      'report.style.detailed': '详细',
      'report.style.detailed.hint': '全部信息：作者、时间、分支、行数',
      'report.advanced': '高级',
      'report.toggle.stripPrefix': '去掉 fix/perf 等前缀',
      'report.toggle.stripPrefix.hint': '去掉提交说明开头的类型标签，如 fix: 修复登录',
      'report.toggle.lines': '显示变更行数',
      'report.toggle.lines.hint': '在总览和每条提交后显示 +新增/-删除',
      'report.toggle.time': '显示提交时间',
      'report.toggle.time.hint': '每条提交前显示时:分',
      'report.toggle.author': '显示提交人',
      'report.toggle.author.hint': '在每条提交后显示提交人（长报告容易忘记是谁写的）',
      'report.numbering': '序号',
      'report.settings': '格式设置',
      'polish.title': 'AI 润色',
      'polish.level': '改写力度',
      'polish.levelHint': '决定改写到什么程度，事实和数字始终不变',
      'polish.level.items': '润色条目',
      'polish.level.items.hint': '保留分仓库结构和每条清单，只把措辞改通顺',
      'polish.level.paragraph': '合并成段',
      'polish.level.paragraph.hint': '把同一仓库的条目合成一段连贯的话',
      'polish.level.summary': '精简成句',
      'polish.level.summary.hint': '每个仓库压成一句话概括',
      'polish.tone': '语气',
      'polish.tone.plain': '简洁专业',
      'polish.tone.report': '汇报口吻',
      'polish.tone.natural': '朴实自然',
      'polish.note': '补充说明',
      'polish.noteHint': '可选，例如：面向技术负责人，突出架构改动',
      'polish.prompt': '提示词',
      'polish.promptHint': '可以查看和临时修改；留空则用内置提示词。修改只影响这一次。',
      'polish.promptReset': '恢复内置提示词',
      'polish.result': '润色结果',
      'polish.waiting': '正在生成…',
      'polish.idle': '点「开始润色」生成结果',
      'polish.start': '开始润色',
      'polish.stop': '停止',
      'polish.apply': '应用到报告',
      'polish.cancel': '关闭',
      'polish.streaming': '生成中',
      'polish.failed': '润色失败：{message}',
      'polish.numbersChanged': '润色结果出现了原文没有的数字（{extra}），已拒绝应用。可以手动改掉后重试。',
      'polish.emptyResult': '润色结果是空的，无法应用',
      'polish.applied': '已应用润色结果',
      'polish.appliedHint': '窗口顶部可切回原文',
      'report.view.polished': '润色后',
      'report.view.original': '原文',

      'report.settings.save': '保存格式',
      'report.styleHint': '决定报告的整体骨架和取舍',
      'report.numberingHint': '每条提交前面的标记，仅纯文本格式下生效',
      'report.numbering.dash.hint': '- 开始的横线',
      'report.numbering.bullet.hint': '• 开始的圆点',
      'report.numbering.numbered.hint': '1. 2. 3. 数字编号',
      'report.numbering.paren.hint': '1）2）3）中文括号',
      'report.numbering.none.hint': '不显示任何标记',
      'report.limitHint': '每个仓库最多列出多少条提交，超出的会注明还有多少条',
      'report.formatHint': '纯文本可以直接贴进公司系统的输入框',
      'report.format.plain.hint': '无 Markdown 标记，适合贴进文本框',
      'report.format.markdown.hint': '带标题和列表标记，适合存档或发到支持 Markdown 的地方',
      'report.advancedHint': '逐项覆盖风格自带的默认值',
      'report.preview': '预览',
      'report.firstRun.title': '先设置日报格式',
      'report.firstRun.badge': '只需设置一次',
      'report.firstRun.intro': '设置好之后，每次生成都沿用这套格式，不用再调。想改的话，在报告窗口右上角的齿轮里随时调整。',
      'report.firstRun.save': '保存并生成',
      'report.firstRun.cancel': '稍后',
      'report.scopeHint': '只统计所有仓库还是仅你自己',
      'scope.all.hint': '统计所有仓库的全部提交',
      'scope.mine.hint': '只统计你自己的提交',

      'report.numbering.dash': '- 横线',
      'report.numbering.bullet': '• 圆点',
      'report.numbering.numbered': '1. 数字',
      'report.numbering.paren': '1）括号',
      'report.numbering.none': '无序号',
      'report.numbering.markdownOnly': 'Markdown 只支持「-」和「1.」，切到纯文本才能使用其他序号',
      'report.limit': '条数',
      'report.limit.all': '全部',
      'report.limit.n': '{n} 条',
      'skin.label': '皮肤',
      'skin.title': '皮肤与背景',
      'skin.default': '默认 · 跟随主题',
      'skin.warm': '暖阳',
      'skin.bamboo': '青竹',
      'skin.mist': '海雾',
      'skin.night': '暗夜',
      'skin.uploadOne': '上传图片',
      'skin.pickFolder': '选择文件夹',
      'skin.dailyRandom': '每天随机一张',
      'skin.poolCount': '背景库 {n} 张',
      'skin.importing': '正在导入 {done}/{total}…',
      'skin.importDone': '已导入 {n} 张',
      'skin.importPartial': '已导入 {done} 张，{failed} 张失败',
      'skin.importNone': '该文件夹里没有图片',
      'skin.poolCapped': '（最多保留 40 张）',
      'skin.needPool': '开启后每天从背景库随机选一张；先用「选择文件夹」导入图片',
      'skin.clearBg': '清除背景',
      'skin.clearPool': '清空背景库',
      'skin.uploadFailed': '背景图处理失败，请换一张试试',
      'skin.saveFailed': '背景图保存失败（浏览器存储不可用或已满）',
      'quip.reroll': '点击换一句',
      'update.aria': '检查更新',
      'update.checking': '正在检查…',
      'update.latest': '已是最新',
      'update.updating': '正在更新到 v{version}，完成后自动刷新…',
      'update.done': '已更新到 v{version}，即将刷新…',
      'update.failed': '更新失败：{message}',
      'update.timeout': '更新超时，请稍后手动刷新页面',
      'update.local': '当前是本地开发安装，不会自动更新',
      'update.available': '新版本 v{version} 可用，点击更新',
      'projects.label': '项目源',
      'projects.title': '项目源',
      'projects.add': '从目录添加',
      'projects.hint': '选择包含 git 仓库的文件夹；文件夹本身或其子目录中的仓库会自动纳入统计。',
      'projects.empty': '还没有添加项目目录',
      'projects.remove': '移除',
      'projects.removed': '已移除',
      'projects.added': '已添加：{path}',
      'projects.exists': '该目录已在列表中',
      'projects.addFailed': '操作失败：{message}',
    };

    /** English dictionary. */
    const en = {
      panel: 'Git Pulse',
      title: 'Git Pulse',
      subtitle: 'How much work your repositories got done lately',
      'range.today': 'Today',
      'range.yesterday': 'Yesterday',
      'range.week': 'This week',
      'range.month': 'This month',
      'range.custom': 'Custom',
      'custom.from': 'From',
      'custom.to': 'To',
      'custom.last7': 'Last 7 days',
      'custom.last30': 'Last 30 days',
      'custom.lastWeek': 'Last week',
      'custom.lastMonth': 'Last month',
      'custom.errOrder': 'The start date must not be after the end date',
      'custom.errIncomplete': 'Choose both a start and an end date',
      'custom.errFuture': 'Dates after today cannot be selected',
      'custom.errSpan': 'The range must not exceed 366 days',
      'report.range': 'Range report',
      'report.title.range': 'Work Report',
      refresh: 'Refresh',
      loading: 'Crunching numbers…',
      'loading.2': 'Leafing through the git ledger…',
      'loading.3': 'Counting the lines you typed today…',
      'loading.4': 'Someone is sneaking in a nap…',
      loadFailed: 'Failed to load stats',
      retry: 'Retry',
      'section.repos': 'Repositories',
      'stat.commits': 'Commits',
      'stat.additions': 'Lines added',
      'stat.deletions': 'Lines deleted',
      'stat.repos': 'Active repos',
      'stat.files': 'Files changed',
      'stat.authors': 'Active authors',
      'scope.all': 'Everyone',
      'scope.mine': 'Mine only',
      'repo.noIdentity': 'No git identity',
      'repo.truncated': 'May be incomplete',
      'repo.truncatedHint': 'The number of commits read reached commitLimit, so older commits may be missing. Raise commitLimit in the plugin configuration.',
      'empty': 'No commits in this period',
      'emptyHint': 'Add extraRoots in the plugin configuration to cover more directories',
      'empty.mine': 'None of your commits were recognized',
      'emptyHint.mine': 'Each repository needs a git user.email matching yours; set myEmail in the plugin config to cover other machines',
      'card.commits': '{n} commits',
      'source.workspace': 'Workspace',
      'source.extra': 'Extra',
      'authors.label': 'Authors',
      'authors.more': ' +{n} more',
      'commits.more': '{n} more commits not shown',
      'report.daily': 'Daily report',
      'report.dailyYesterday': "Yesterday's report",
      'report.weekly': 'Weekly report',
      'report.monthly': 'Monthly report',
      'report.title.daily': 'Daily Report',
      'report.title.weekly': 'Weekly Report',
      'report.title.monthly': 'Monthly Report',
      'report.rangeLabel': 'Range',
      'report.format.markdown': 'Markdown',
      'report.format.plain': 'Plain text',
      'report.overviewPlain': '1. Overview',
      'report.detailPlain': '2. By repository',
      'report.generating': 'Generating…',
      'report.failed': 'Generation failed',
      'report.copy': 'Copy all',
      'report.copied': 'Copied',
      'report.close': 'Close',
      'report.overview': 'Overview',
      'report.detail': 'By repository',
      'report.overviewBody': '{commits} commits, {additions} lines added, {deletions} lines deleted, across {repos} repositories.',
      'report.overviewBodyNoLines': '{commits} commits across {repos} repositories.',
      'report.repoLine': '{commits} commits, +{additions}/-{deletions} lines',
      'report.repoLineNoLines': '{commits} commits',
      'report.emptyBody': 'No commits in this period.',
      'report.errors': 'Repositories that could not be read',
      'report.noIdentityNote': 'Note: these repositories have no git identity, so your commits cannot be told apart and were excluded: {repos}',
      'report.footer': 'Generated by {app}',
      'report.truncated': '(first 20 shown)',
      'report.truncatedCount': '({n} more not shown)',
      'report.style': 'Style',
      'report.style.worklog': 'Work list',
      'report.style.worklog.hint': 'Only what was done: no type prefix, time, or line counts',
      'report.style.brief': 'Brief',
      'report.style.brief.hint': 'Work list plus a commit count per repository',
      'report.style.standard': 'Standard',
      'report.style.standard.hint': 'Adds times, branch, and a statistics line',
      'report.style.detailed': 'Detailed',
      'report.style.detailed.hint': 'Everything: authors, times, branch, line counts',
      'report.advanced': 'Advanced',
      'report.toggle.stripPrefix': 'Strip fix/perf prefixes',
      'report.toggle.stripPrefix.hint': 'Drop the type tag, e.g. "fix: login" becomes "login"',
      'report.toggle.lines': 'Show line counts',
      'report.toggle.lines.hint': 'Show +added/-deleted in the summary and per commit',
      'report.toggle.time': 'Show commit times',
      'report.toggle.time.hint': 'Show hour:minute before each commit',
      'report.toggle.author': 'Show authors',
      'report.toggle.author.hint': 'Name the author after each commit',
      'report.numbering': 'Markers',
      'report.settings': 'Format settings',
      'polish.title': 'AI polish',
      'polish.level': 'Rewrite level',
      'polish.levelHint': 'How far to rewrite; facts and numbers never change',
      'polish.level.items': 'Polish bullets',
      'polish.level.items.hint': 'Keep the per-repository structure and each bullet; only reword',
      'polish.level.paragraph': 'Merge to paragraphs',
      "polish.level.paragraph.hint": "Join one repository's bullets into a connected paragraph",
      'polish.level.summary': 'One sentence each',
      'polish.level.summary.hint': 'Condense each repository to a single sentence',
      'polish.tone': 'Tone',
      'polish.tone.plain': 'Plain',
      'polish.tone.report': 'Status report',
      'polish.tone.natural': 'Natural',
      'polish.note': 'Extra guidance',
      'polish.noteHint': 'Optional, e.g. for a technical lead; highlight architecture changes',
      'polish.prompt': 'Prompt',
      'polish.promptHint': 'View and temporarily edit it; leave empty for the built-in prompt. Edits apply to this run only.',
      'polish.promptReset': 'Restore the built-in prompt',
      'polish.result': 'Result',
      'polish.waiting': 'Generating…',
      'polish.idle': 'Press "Start" to generate',
      'polish.start': 'Start',
      'polish.stop': 'Stop',
      'polish.apply': 'Apply to report',
      'polish.cancel': 'Close',
      'polish.streaming': 'Generating',
      'polish.failed': 'Polish failed: {message}',
      'polish.numbersChanged': 'The rewrite introduced numbers the original does not have ({extra}); it was not applied. Edit them out and try again.',
      'polish.emptyResult': 'The result is empty and cannot be applied',
      'polish.applied': 'Polished text applied',
      'polish.appliedHint': 'Switch back to the original at the top',
      'report.view.polished': 'Polished',
      'report.view.original': 'Original',

      'report.settings.save': 'Save format',
      'report.styleHint': 'Sets the overall shape of the report',
      'report.numberingHint': 'Marker before each commit; plain text only',
      'report.numbering.dash.hint': 'A leading dash',
      'report.numbering.bullet.hint': 'A leading bullet',
      'report.numbering.numbered.hint': '1. 2. 3. numbering',
      'report.numbering.paren.hint': '1) 2) 3) parenthesised',
      'report.numbering.none.hint': 'No marker at all',
      'report.limitHint': 'Maximum commits listed per repository; the rest are counted',
      'report.formatHint': 'Plain text pastes straight into a company form',
      'report.format.plain.hint': 'No Markdown syntax; paste into any text box',
      'report.format.markdown.hint': 'Headings and list markers for archives or Markdown-aware tools',
      'report.advancedHint': 'Flip individual defaults of the chosen style',
      'report.preview': 'Preview',
      'report.firstRun.title': 'Set up your report format',
      'report.firstRun.badge': 'Once only',
      'report.firstRun.intro': 'Every report after this reuses this format. Change it any time from the gear in the report window.',
      'report.firstRun.save': 'Save and generate',
      'report.firstRun.cancel': 'Later',
      'report.scopeHint': 'All repositories, or only yours',
      'scope.all.hint': 'Every commit in every repository',
      'scope.mine.hint': 'Only commits that are yours',

      'report.numbering.dash': 'Dash',
      'report.numbering.bullet': 'Bullet',
      'report.numbering.numbered': '1. Numbered',
      'report.numbering.paren': '1) Parenthesised',
      'report.numbering.none': 'No markers',
      'report.numbering.markdownOnly': 'Markdown only supports "-" and "1."; switch to plain text for the others',
      'report.limit': 'Commits',
      'report.limit.all': 'All',
      'report.limit.n': '{n}',
      'skin.label': 'Skin',
      'skin.title': 'Skin & background',
      'skin.default': 'Default · Follow theme',
      'skin.warm': 'Sunrise',
      'skin.bamboo': 'Bamboo',
      'skin.mist': 'Sea mist',
      'skin.night': 'Night',
      'skin.uploadOne': 'Upload image',
      'skin.pickFolder': 'Choose folder',
      'skin.dailyRandom': 'Daily random',
      'skin.poolCount': 'Library: {n} images',
      'skin.importing': 'Importing {done}/{total}…',
      'skin.importDone': 'Imported {n} images',
      'skin.importPartial': 'Imported {done} images, {failed} failed',
      'skin.importNone': 'No images in that folder',
      'skin.poolCapped': '(at most 40 kept)',
      'skin.needPool': 'Picks one image from the library each day; import a folder first',
      'skin.clearBg': 'Remove background',
      'skin.clearPool': 'Clear library',
      'skin.uploadFailed': 'Could not process that image, try another one',
      'skin.saveFailed': 'Could not save the background (browser storage unavailable or full)',
      'quip.reroll': 'Click for another one',
      'update.aria': 'Check for updates',
      'update.checking': 'Checking…',
      'update.latest': 'Already up to date',
      'update.updating': 'Updating to v{version}; the page will refresh…',
      'update.done': 'Updated to v{version}; refreshing…',
      'update.failed': 'Update failed: {message}',
      'update.timeout': 'Update timed out; refresh the page manually later',
      'update.local': 'This is a local development install; it is not updated automatically',
      'update.available': 'New version v{version} available — click to update',
      'projects.label': 'Projects',
      'projects.title': 'Project sources',
      'projects.add': 'Add directory',
      'projects.hint': 'Pick a folder containing git repos; the folder itself and repos inside are included in stats.',
      'projects.empty': 'No project directories added yet',
      'projects.remove': 'Remove',
      'projects.removed': 'Removed',
      'projects.added': 'Added: {path}',
      'projects.exists': 'Already in the list',
      'projects.addFailed': 'Failed: {message}',
    };

    // ------------------------------------------------------------------
    // Praise & roast quips ("夸夸/嘲讽"), keyed by today's activity.
    // Decks reshuffle only when exhausted, so lines never repeat in a cycle.
    // ------------------------------------------------------------------

    const QUIP_POOLS = {
      zh: {
        praise: [
          '这提交密度，同事还以为你在闭关赶版本。',
          '稳中有进，代码和日报都好写了。',
          '今天手感不错，一把梭得漂亮。',
          '提交记录整整齐齐，强迫症狂喜。',
          '这产出，项目经理看了想批年假。',
          '代码量扎实，测试同学都有得忙了。',
          '今天的你，是仓库最亮的那个仔。',
          '持续推进，节奏感拉满。',
          '这进度条，看得人心里踏实。',
          '又稳又快，典型的老练发挥。',
          '今天的 commit 历史干净得能当范文。',
          '这波输出，堪称教科书级推进。',
          '产量与质量齐飞，赞一个。',
          '键盘没白敲，进度没白赶。',
          '这状态要保持，周五指日可待。',
          '提交连连看，看得人赏心悦目。',
          '今天产出猛，老板的咖啡都没白买。',
          '每一行都是进度，稳。',
          '高效一天，代码不会说谎。',
          '这提交速度，CI 都要感谢你给它找活干。',
          '干得漂亮，工位都在发光。',
          '持续输出，稳步向前，好看。',
          '这节奏，版本计划都在给你让路。',
          '代码写得欢，日报不慌。',
          '今天的仓库因为你热闹了不少。',
          '稳扎稳打，进度喜人。',
          '这产出，值得给自己点一杯奶茶。',
          '行云流水，今天顺得很。',
          '努力肉眼可见，继续冲。',
          '今天这架势，Bug 都绕着你走。',
        ],
        roast: [
          '提交是有一点，但摸鱼的成分也不少吧？',
          '就这？我预期的 commit 呢？',
          '今天的 git log，安静得像凌晨的办公室。',
          '这么点提交，日报打算怎么写？编吗？',
          '键盘是不是只是用来放杯子的？',
          '这进度，怕是连编译器都没醒。',
          '提交次数少得一只手就数过来了。',
          '今天是在养 Bug 还是修 Bug？',
          'git 状态一片红，commit 却没几个。',
          '这产出，工位绿萝都替你着急。',
          '摸鱼一时爽，日报火葬场。',
          '今天的代码量，还不够写个 Hello World。',
          '提交这么少，是在等灵感快递上门吗？',
          '工作量与工资的换算，今天有点危险。',
          '从老板的角度看，这属于带薪冥想。',
          '这提交频率，Git 都快忘记你的名字了。',
          '不是不干，是干得特别含蓄？',
          '今天的产出，建议配文：安静的一天。',
          '这速度，蜗牛看了都想让你加把劲。',
          'commit 数量提醒：日报还没着落。',
          '摸鱼界的天花板，就是这个样子吗？',
          '今天的代码贡献，蚊子腿也是肉？',
          '进度条没动，外卖倒是很准时。',
          '这么闲，要不要帮忙倒个垃圾？',
          '今天的你，主要成就是打开了 IDE。',
          '提交数少得可怜，好意思说忙？',
          '这产量，版本号都不好意思往上跳。',
          '再摸下去，仓库都要长草了。',
          '今天的 git blame，都是昨天的你。',
          '效率存疑，但咖啡摄入确实稳定。',
        ],
        zero: [
          '今天零提交，是带薪休息还是带薪失联？',
          '一行没交，摸鱼实锤了啊。',
          'git log 空空如也，今天主打一个陪伴。',
          '今天零提交，键盘处于待机状态。',
          '没提交就没真相，反正我看不见你干活。',
          '今天的仓库很安静，你也一样。',
          '零提交，建议日报标题：《休整的一天》。',
          '代码没动，心思估计也不在工位。',
          '今天主打思维上的工作，是吧？',
          '零提交？还好意思说自己在思考架构。',
          '键盘积灰预警：今天零提交。',
          '没提交的日子，工位显得格外冷清。',
          '今天的产出为零，气场倒是两米八。',
          '仓库提醒：今日无人为它添砖加瓦。',
          '一行代码没写，咖啡倒是没少喝。',
          '零提交，这很周末，可惜不是。',
        ],
        big: [
          '十连击达成，今天的提交记录闪闪发光。',
          '这提交量，是准备把整个版本一口气吃完？',
          '高产似神仙，今天的你无人能挡。',
          '这个强度，仓库都想给你发奖金。',
          '提交刷屏了，同事还以为版本提前了。',
          '今天效率封顶，代码流水线开足马力。',
          '这波高产出，日报素材多到挑花眼。',
          '海量提交，建议给自己颁个今日劳模。',
          '今天的你，是 CI 服务器最怕的人。',
          '强度拉满，键盘寿命减一天，值。',
        ],
        del: [
          '删除行数爆表，减负大师就是你。',
          '删的比写的多，代码库瘦身高手。',
          '大刀阔斧，今天主打一个断舍离。',
          '删代码一时爽，一直删一直爽。',
          '负行数英雄，代码库欠你一面锦旗。',
          '今天不是在写代码，是在给代码瘦身。',
          '删得果断，同事的 review 都轻松了。',
          '这删除量，重构之神今天在线。',
        ],
      },
      en: {
        praise: [
          'A steady stream of commits — the roadmap approves.',
          'Clean history today; the changelog practically writes itself.',
          'Nice pace. Your future self says thanks.',
          'That is a productive keyboard right there.',
          'Solid output — the reviewers will be pleased.',
          'Today the repository shines because of you.',
          'Momentum looks great; keep it rolling.',
          'Efficient day. The CI barely kept up.',
          'This is what steady progress looks like.',
          'Big output, small diffs to review. Ideal.',
          'The graph goes up. So does my respect.',
          'Shipping like a machine today.',
          'That commit streak deserves a coffee.',
          'Smooth sailing — everything landed cleanly.',
          'The roadmap just got shorter, thanks to you.',
          'Textbook execution today.',
          'Quality and quantity, both present. Rare.',
          'Your commit graph is a joy to read.',
          'The build is green and so is my mood.',
          'Productive day — the ticket queue felt it.',
          'Great rhythm; the release notes thank you.',
          'That is some serious forward motion.',
          'The repo got warmer with every commit.',
          'Your keyboard earned its salary today.',
        ],
        roast: [
          'Those commit counts are… aspirational?',
          'The git log is quieter than a library at night.',
          'Is the keyboard just a cup holder today?',
          'How exactly will the daily report explain this?',
          'The compiler napped. So did you, apparently.',
          'That output fits on one sticky note.',
          'The repo barely noticed you were here.',
          'Busy doing what, exactly? The log is empty.',
          'Your commit history says: gone fishing.',
          'The plant on your desk is more productive.',
          'Coffee intake: high. Commit intake: low.',
          'The progress bar moved less than your chair.',
          'One commit? Bold strategy for a workday.',
          'The ticket is still open, and so is my doubt.',
          'That is what people call quiet quitting, quietly.',
          'The diff is small enough to frame on a wall.',
          'The version number refuses to budge today.',
          'The IDE was open. The commits were not.',
          'Lunch arrived on time; code did not.',
          'Today the repo grew moss, not code.',
          'The status page is calm. Too calm.',
          'Git blames yesterday for all of it.',
          'Shall we call it a philosophical workday?',
          'The only thing shipped today is doubt.',
        ],
        zero: [
          'Zero commits today. Bold. Very bold.',
          'The git log is a blank canvas today.',
          'No commits — a day of pure contemplation.',
          'The keyboard remained in standby mode.',
          'Zero commits, infinite meetings, presumably.',
          'Today the repo fasted.',
          'Not a single commit. The plants are thriving though.',
          'The daily report writes itself: nothing happened.',
          'Zero code, zero bugs introduced. Silver linings.',
          'The repo waited. The repo kept waiting.',
          'A perfect day for the archive, not for git.',
          'Architectural thinking, right? Right?',
        ],
        big: [
          'Ten-plus commits — someone set the repo on fire today.',
          'This is a code avalanche, in the best way.',
          'High output mode: fully engaged.',
          'The CI server fears you now.',
          'That commit storm deserves a medal.',
          'Report material overflowing — lucky you.',
          'The version number finally broke a sweat.',
          'Today: productivity off the charts.',
        ],
        del: [
          'More deletions than additions — the codebase slims down.',
          'A true cleanup artist at work today.',
          'Refactoring master: the repo thanks you.',
          'Deleting with confidence. Respect.',
          'The diff is negative today, positively great.',
          'Less code, same features. Magic.',
        ],
      },
    };

    const QUIP_MOOD = { praise: '🎉', roast: '🌶️', zero: '🛋️', big: '🚀', del: '🧹' };

    function shuffleQuips(list) {
      const deck = list.slice();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    /** Deck factory: pops shuffled lines; reshuffles the full pool when drained. */
    function makeQuipDeck(pool) {
      let deck = shuffleQuips(pool);
      return () => {
        if (deck.length === 0) deck = shuffleQuips(pool);
        return deck.pop();
      };
    }

    /** Which quip pool fits today's numbers best. */
    function quipCategory(stats) {
      const commits = stats?.commits ?? 0;
      const insertions = stats?.insertions ?? 0;
      const deletions = stats?.deletions ?? 0;
      if (commits <= 0) return 'zero';
      if (commits >= 10) return 'big';
      if (deletions >= 50 && deletions > insertions * 1.5) return 'del';
      if (commits <= 2) return Math.random() < 0.6 ? 'roast' : 'praise';
      if (commits <= 5) return Math.random() < 0.5 ? 'roast' : 'praise';
      return Math.random() < 0.7 ? 'praise' : 'roast';
    }

    const css = `
.gl-page{height:100%;box-sizing:border-box;overflow-y:auto;padding:24px 28px 48px;font-family:var(--dsw-font-family);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}
.gl-inner{max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.gl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.gl-title{margin:0;font-size:20px;font-weight:600;line-height:28px}
.gl-sub{margin:2px 0 0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.gl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.gl-tabs{display:inline-flex;gap:4px;padding:3px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1)}
.gl-tab{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:18px;padding:4px 12px;border-radius:var(--dsw-radius-sm);cursor:pointer;white-space:nowrap}
.gl-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}
.gl-tab[data-active="true"]{background:var(--dsw-alias-brand-primary);color:#fff}
.gl-actions{display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap}
.gl-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:18px;padding:5px 12px;border-radius:var(--dsw-radius-sm);cursor:pointer;white-space:nowrap}
.gl-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.gl-btn:disabled{opacity:.55;cursor:default}
.gl-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.gl-tile{border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);padding:12px 16px}
.gl-tileLabel{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.gl-tileValue{font-size:24px;line-height:32px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums}
.gl-add{color:var(--dsw-alias-state-success-primary)}
.gl-del{color:var(--dsw-alias-state-error-primary)}
.gl-section{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:none;letter-spacing:.02em}
.gl-cards{display:flex;flex-direction:column;gap:12px}
.gl-card{border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1)}
.gl-cardHead{display:flex;align-items:baseline;gap:10px;padding:12px 16px 4px;cursor:pointer;flex-wrap:wrap}
.gl-repo{font-size:14px;font-weight:600}
.gl-chip{font-size:11px;line-height:16px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.gl-chipOk{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary);background:transparent}
.gl-chipWarn{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary);background:transparent}
.gl-cardPath{font-size:12px;color:var(--dsw-alias-label-secondary);padding:0 16px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gl-cardStats{display:flex;align-items:center;gap:14px;margin-left:auto;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
.gl-caret{color:var(--dsw-alias-label-secondary);font-size:11px}
.gl-cardBody{border-top:1px solid var(--dsw-alias-border-l1);padding:10px 16px 12px}
.gl-authorsLine{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:8px}
.gl-commit{display:flex;align-items:baseline;gap:8px;padding:4px 0;font-size:13px;min-width:0}
.gl-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-brand-primary);flex:none}
.gl-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.gl-commitMeta{margin-left:auto;flex:none;color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums}
.gl-more{font-size:12px;color:var(--dsw-alias-label-secondary);padding-top:6px}
.gl-repoError{font-size:12px;color:var(--dsw-alias-state-error-primary);padding:10px 16px 12px;word-break:break-all}
.gl-empty{border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:32px 24px;text-align:center}
.gl-emptyTitle{margin:0;font-size:14px;font-weight:600}
.gl-emptyHint{margin:6px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}

/* Waiting state: bars grow in turn, the sleeper rides the tallest, a fish passes. */
.gl-importing{display:flex;align-items:center;gap:10px}
.gl-importingText{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.gl-progress{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.gl-progressFill{height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary);transition:width .25s ease}
.gl-load{display:inline-flex;align-items:center;gap:12px;color:var(--dsw-alias-label-secondary)}
.gl-loadArt{flex:none;overflow:visible}
.gl-loadLabel{font-size:13px;line-height:19px}
.gl-loadBar{transform-box:fill-box;transform-origin:bottom;animation:gl-grow 1.6s ease-in-out infinite}
.gl-loadBar[data-bar="1"]{animation-delay:0s}
.gl-loadBar[data-bar="2"]{animation-delay:.18s}
.gl-loadBar[data-bar="3"]{animation-delay:.36s}
.gl-loadSleeper{animation:gl-bob 1.8s ease-in-out infinite}
.gl-loadZzz{transform-box:fill-box;transform-origin:center;animation:gl-zzz 2.2s ease-in-out infinite}
.gl-loadFish{animation:gl-swim 3.2s linear infinite}
.gl-loadBubble{animation:gl-rise 2.4s ease-out infinite}
.gl-loadBubble[data-b="2"]{animation-delay:.7s}
@keyframes gl-grow{0%,100%{transform:scaleY(.55)}45%{transform:scaleY(1)}}
@keyframes gl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
@keyframes gl-zzz{0%{opacity:.15;transform:translateY(1px) scale(.94)}45%{opacity:.95;transform:translateY(-2px) scale(1)}100%{opacity:0;transform:translateY(-5px) scale(1.04)}}
@keyframes gl-swim{0%{transform:translateX(-6px)}55%{transform:translateX(10px)}100%{transform:translateX(-6px)}}
@keyframes gl-rise{0%{opacity:0;transform:translateY(3px)}30%{opacity:.8}100%{opacity:0;transform:translateY(-6px)}}
/* Respect a reduced-motion preference: keep the art, drop the movement. */
@media (prefers-reduced-motion: reduce){
  .gl-loadBar,.gl-loadSleeper,.gl-loadZzz,.gl-loadFish,.gl-loadBubble{animation:none}
}
.gl-status{display:flex;align-items:center;gap:8px;padding:28px 4px;color:var(--dsw-alias-label-secondary);font-size:13px}
.gl-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:gl-pulse 1.2s ease-in-out infinite}
.gl-dot[data-error="true"]{background:var(--dsw-alias-state-error-primary);animation:none}
@keyframes gl-pulse{0%,100%{opacity:.35}50%{opacity:1}}
.gl-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:32px;z-index:60}
.gl-modal{width:min(760px,100%);max-height:min(640px,100%);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);box-shadow:0 16px 48px rgba(0,0,0,.25);overflow:hidden}
.gl-modalWide{width:min(920px,100%);max-height:min(760px,100%)}
.gl-textarea{width:100%;box-sizing:border-box;font:inherit;font-size:12.5px;line-height:1.55;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);resize:vertical}
.gl-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.gl-textareaMono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.gl-textareaFill{flex:1;min-height:200px;resize:none;border:0;border-radius:0;background:transparent}
.gl-details{font-size:12px;color:var(--dsw-alias-label-secondary)}
.gl-details summary{cursor:pointer;font-weight:600;color:var(--dsw-alias-label-primary);padding:2px 0}
.gl-details .gl-textarea{margin:6px 0}
.gl-btnPrimary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:#fff}
.gl-btnPrimary:hover{filter:brightness(1.06);background:var(--dsw-alias-brand-primary)}
.gl-setBody{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,0.85fr);gap:18px;padding:16px 18px;overflow-y:auto;min-height:0}
.gl-setForm{display:flex;flex-direction:column;gap:14px;min-width:0}
.gl-setIntro{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);padding:10px 12px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);border-left:2px solid var(--dsw-alias-brand-primary)}
.gl-setSection{display:flex;flex-direction:column;gap:7px}
.gl-setHead{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.gl-setTitle{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.gl-setHint{margin:0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.gl-choiceGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.gl-choiceGridTight{grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px}
.gl-styleCard{display:flex;flex-direction:column;gap:3px;text-align:left;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit}
.gl-styleCard:hover{background:var(--dsw-alias-interactive-bg-hover)}
.gl-styleCard[data-active="true"]{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.gl-styleName{font-size:13px;font-weight:600}
.gl-styleHint{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.gl-choice{padding:5px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.gl-choice:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.gl-choice[data-active="true"]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}
.gl-setPreview{display:flex;flex-direction:column;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.gl-setPreviewHead{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gl-setPreviewBody{margin:0;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.62;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);overflow:auto;flex:1;min-height:180px}
.gl-page[data-skin="night"] .gl-setPreview{background:var(--dsw-alias-bg-base)}
@media (max-width:880px){.gl-setBody{grid-template-columns:minmax(0,1fr)}}

.gl-reportControls{display:flex;flex-wrap:wrap;gap:10px 18px;padding:12px 18px;border-bottom:1px solid var(--dsw-alias-border-l1);align-items:flex-start;flex:none}
.gl-controlGroup{display:flex;align-items:center;gap:8px;min-width:0}
.gl-controlWide{flex-basis:100%}
.gl-controlLabel{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.gl-toggleRow{display:flex;flex-wrap:wrap;gap:6px 14px}
.gl-check{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}
.gl-check input{cursor:pointer;margin:0}
.gl-check input:disabled{cursor:default}
.gl-check:has(input:disabled){opacity:.55;cursor:default}
.gl-modalHead{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gl-modalTitle{margin:0;font-size:15px;font-weight:600}
.gl-modalRange{font-size:12px;color:var(--dsw-alias-label-secondary)}
.gl-preLoading{display:flex;align-items:center;justify-content:center;min-height:220px}
.gl-pre{flex:1;overflow:auto;margin:0;padding:16px 18px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.gl-modalFoot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--dsw-alias-border-l1)}
.gl-skinLabel{font-size:12px;color:var(--dsw-alias-label-secondary);margin-right:2px}
.gl-swatch{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background-clip:padding-box;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2)}
.gl-swatch:hover{box-shadow:inset 0 0 0 1px var(--dsw-alias-label-secondary)}
.gl-swatch[data-active="true"]{border-color:var(--dsw-alias-brand-primary)}
.gl-skinSection{margin:14px 0 8px;font-size:13px;font-weight:600}
.gl-skinRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.gl-skinRowLabel{font-size:13px;color:var(--dsw-alias-label-primary)}
.gl-switch{position:relative;width:34px;height:20px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;background:var(--dsw-alias-bg-layer-2);transition:background .15s,border-color .15s}
.gl-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .15s}
.gl-switch[data-checked="true"]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.gl-switch[data-checked="true"]::after{transform:translateX(14px);background:#fff}
.gl-skinStatus{margin-top:10px;font-size:12px;color:var(--dsw-alias-label-secondary);word-break:break-all}
.gl-skinError{font-size:12px;color:var(--dsw-alias-state-error-primary)}
.gl-quip{width:fit-content;margin:6px 0 0;font-size:13px;line-height:18px;color:var(--dsw-alias-brand-primary);cursor:pointer;user-select:none}
.gl-quip:hover{text-decoration:underline}
.gl-updateBtn{color:var(--dsw-alias-brand-primary);display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0}
.gl-updateBtn:disabled{opacity:.6;cursor:default}
.gl-updateStatus{font-size:12px;color:var(--dsw-alias-label-secondary);max-width:280px;word-break:break-all}
.gl-iconBtn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}
.gl-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.gl-iconBtn:disabled{opacity:.6;cursor:default}
.gl-iconBtn[data-alert="true"]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.gl-iconBtn[data-alert="true"]::after{content:'';position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);border:1.5px solid var(--dsw-alias-bg-base);animation:gl-pulse 1.2s ease-in-out infinite}
.gl-rootRow{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px}
.gl-rootPath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);direction:ltr;text-align:left}
/* Built-in skins: token overrides scoped to the plugin page subtree only.
   The default skin sets nothing and follows the host light/dark theme. */
.gl-page[data-skin="warm"]{--dsw-alias-bg-base:#f6ead9;--dsw-alias-bg-layer-1:#fffdf8;--dsw-alias-bg-layer-2:#f8ecd9;--dsw-alias-bg-overlay:#fffdf8;--dsw-alias-border-l1:#ecdcc6;--dsw-alias-border-l2:#dfc9a9;--dsw-alias-brand-primary:#c96f22;--dsw-alias-label-primary:#443528;--dsw-alias-label-secondary:#8d7a63;--dsw-alias-interactive-bg-hover:#f7e8d2}
.gl-page[data-skin="bamboo"]{--dsw-alias-bg-base:#e9f2ec;--dsw-alias-bg-layer-1:#fbfdfb;--dsw-alias-bg-layer-2:#e2efe6;--dsw-alias-bg-overlay:#fbfdfb;--dsw-alias-border-l1:#d3e4d9;--dsw-alias-border-l2:#b7d3c1;--dsw-alias-brand-primary:#2f8a5f;--dsw-alias-label-primary:#2c3d33;--dsw-alias-label-secondary:#6e8578;--dsw-alias-interactive-bg-hover:#e3f0e9}
.gl-page[data-skin="mist"]{--dsw-alias-bg-base:#e9eff7;--dsw-alias-bg-layer-1:#fbfcfe;--dsw-alias-bg-layer-2:#e0eaf4;--dsw-alias-bg-overlay:#fbfcfe;--dsw-alias-border-l1:#d2dfea;--dsw-alias-border-l2:#b4c8da;--dsw-alias-brand-primary:#3479b8;--dsw-alias-label-primary:#2b3644;--dsw-alias-label-secondary:#6d7f92;--dsw-alias-interactive-bg-hover:#e2edf6}
.gl-page[data-skin="night"]{--dsw-alias-bg-base:#12141a;--dsw-alias-bg-layer-1:#1c1f27;--dsw-alias-bg-layer-2:#262a34;--dsw-alias-bg-overlay:#1c1f27;--dsw-alias-border-l1:#303542;--dsw-alias-border-l2:#454f63;--dsw-alias-brand-primary:#7aa2f7;--dsw-alias-label-primary:#e8eaf0;--dsw-alias-label-secondary:#8d94a5;--dsw-alias-interactive-bg-hover:#262c3a}
.gl-page[data-skin="night"] .gl-date{color-scheme:dark}
.gl-dateRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gl-dateLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}
.gl-date{font:inherit;font-size:13px;line-height:18px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.gl-date:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.gl-dateSep{color:var(--dsw-alias-label-secondary)}
.gl-chipBtn{font:inherit;font-size:12px;line-height:16px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}
.gl-chipBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.gl-dateError{font-size:12px;color:var(--dsw-alias-state-error-primary)}
`;

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    const fmt = (text, params) =>
      params ? String(text).replace(/\{(\w+)\}/g, (_, k) => (params[k] === undefined ? `{${k}}` : String(params[k]))) : String(text);

    const pad2 = (n) => String(n).padStart(2, '0');

    const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const fmtTime = (iso) => {
      const d = new Date(iso);
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };
    const fmtNum = (n) => Number(n ?? 0).toLocaleString();

    // ------------------------------------------------------------------
    // Custom date range helpers (browser-local calendar days, YYYY-MM-DD)
    // ------------------------------------------------------------------

    const CUSTOM_MAX_DAYS = 366;

    const parseDay = (text) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? ''));
      if (!match) return null;
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return fmtDate(date) === text ? date : null;
    };

    const dayOffset = (base, days) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);

    /** Quick picks; every preset ends on or before today. */
    function presetRange(id, now = new Date()) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      switch (id) {
        case 'last7':
          return { from: fmtDate(dayOffset(today, -6)), to: fmtDate(today) };
        case 'last30':
          return { from: fmtDate(dayOffset(today, -29)), to: fmtDate(today) };
        case 'lastWeek': {
          const weekday = (today.getDay() + 6) % 7; // Monday = 0
          const thisMonday = dayOffset(today, -weekday);
          return { from: fmtDate(dayOffset(thisMonday, -7)), to: fmtDate(dayOffset(thisMonday, -1)) };
        }
        case 'lastMonth': {
          const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const last = new Date(today.getFullYear(), today.getMonth(), 0);
          return { from: fmtDate(first), to: fmtDate(last) };
        }
        default:
          return null;
      }
    }

    /** @returns the dictionary key of the first violated rule, or null. */
    function customRangeError(fromStr, toStr, now = new Date()) {
      const from = parseDay(fromStr);
      const to = parseDay(toStr);
      if (!from || !to) return 'custom.errIncomplete';
      if (from > to) return 'custom.errOrder';
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (to > today) return 'custom.errFuture';
      if (Math.round((to - from) / 86_400_000) + 1 > CUSTOM_MAX_DAYS) return 'custom.errSpan';
      return null;
    }

    async function fetchJson(route) {
      const res = await fetch(route, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body && body.message) message = String(body.message);
        } catch {}
        throw new Error(message);
      }
      return res.json();
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
          ok = document.execCommand('copy');
        } catch {}
        area.remove();
        return ok;
      }
    }

    // ------------------------------------------------------------------
    // Skins and background image (browser-local user preference)
    // ------------------------------------------------------------------

    const SKIN_STORAGE_KEY = 'dsh.ganleme.skin';
    /** AI polish levels and tones, mirrored by the Host's instruction tables. */
    const POLISH_LEVELS = ['items', 'paragraph', 'summary'];
    const POLISH_TONES = ['plain', 'report', 'natural'];

    /**
     * Number guard, duplicated from the Host on purpose: the policy that may
     * not be silently skipped must also run here, since the browser is where
     * the hand-edited text exists. Kept in sync with index.js (see the test
     * that asserts both implementations agree on every sample).
     */
    const extractNumbers = (text) => new Set(String(text ?? '').match(/\d+(?:\.\d+)?/gu) ?? []);

    /**
     * @returns `{ ok: true, extra: [] }`, or `{ ok: false, extra }` naming the
     *   numbers the candidate introduced.
     */
    function checkPolishNumbers(original, candidate) {
      const allowed = extractNumbers(original);
      const extra = [...extractNumbers(candidate)].filter((n) => !allowed.has(n));
      return extra.length === 0 ? { ok: true, extra: [] } : { ok: false, extra };
    }

    /**
     * Read the report text ready to polish, or null when the report is not
     * showing anything (still generating, failed, or empty).
     */
    function polishSource(report) {
      return report && typeof report.text === 'string' && report.text.trim() ? report.text : null;
    }

    /**
     * Outcome of pressing "apply": either the report takes the rewrite, or the
     * guard refuses and names the invented numbers. Pure so the button's two
     * branches are testable without a browser (the guard itself once threw here
     * because the client lacked it, leaving the button silently dead).
     * @returns `{ applied: true, text }` or `{ applied: false, extra }`.
     */
    function polishApplication(source, candidate) {
      const text = String(candidate ?? '').trim();
      if (!text) return { applied: false, extra: [], reason: 'empty' };
      const guard = checkPolishNumbers(source, text);
      if (!guard.ok) return { applied: false, extra: guard.extra, reason: 'numbers' };
      return { applied: true, text };
    }

    /** One stored record holds the whole confirmed report format. */
    const REPORT_CONFIG_KEY = 'dsh.ganleme.reportConfig';

    const DEFAULT_REPORT_CONFIG = Object.freeze({
      style: 'worklog',
      numbering: null, // null follows the style's own default
      limit: 20,
      format: 'plain',
      scope: 'mine',
      overrides: {},
    });

    /** Migrate the pre-0.3 separate keys, then drop them. */
    function readReportConfig() {
      const raw = readStored(REPORT_CONFIG_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && REPORT_STYLES[parsed.style]) {
            return { ...DEFAULT_REPORT_CONFIG, ...parsed, overrides: parsed.overrides ?? {} };
          }
        } catch {}
      }
      const legacyStyle = readStored('dsh.ganleme.reportStyle');
      const legacyLimit = Number(readStored('dsh.ganleme.reportLimit'));
      const legacyNumbering = readStored('dsh.ganleme.reportNumbering');
      if (!legacyStyle && !legacyLimit && !legacyNumbering) return null;
      const migrated = {
        ...DEFAULT_REPORT_CONFIG,
        ...(REPORT_STYLES[legacyStyle] ? { style: legacyStyle } : {}),
        ...([0, 20, 50].includes(legacyLimit) ? { limit: legacyLimit } : {}),
        ...(NUMBERING[legacyNumbering] ? { numbering: legacyNumbering } : {}),
      };
      writeReportConfig(migrated);
      writeStored('dsh.ganleme.reportStyle', null);
      writeStored('dsh.ganleme.reportLimit', null);
      writeStored('dsh.ganleme.reportNumbering', null);
      return migrated;
    }

    function writeReportConfig(config) {
      writeStored(REPORT_CONFIG_KEY, JSON.stringify(config));
    }

    /** Sample payload behind the settings preview; one repository, three commits. */
    const PREVIEW_DATA = {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString(),
      to: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString(),
      generatedAt: new Date().toISOString(),
      totals: { commits: 3, insertions: 128, deletions: 24, files: 5, repos: 1, authors: [{ name: '张三', count: 3 }] },
      mine: { commits: 3, insertions: 128, deletions: 24, files: 5, repos: 1, authors: [{ name: '张三', count: 3 }] },
      repos: [{
        key: 'preview',
        title: 'my-project',
        ok: true,
        branch: 'main',
        me: { email: 'me@example.com', emails: ['me@example.com'], name: '张三' },
        stats: { commits: 3, insertions: 128, deletions: 24, files: 5, authors: [{ name: '张三', count: 3 }] },
        mine: { commits: 3, insertions: 128, deletions: 24, files: 5, authors: [{ name: '张三', count: 3 }] },
        commits: [
          { hash: 'a1b2c3d', author: '张三', email: 'me@example.com', subject: 'fix: 修复登录状态丢失的问题', time: new Date(new Date().setHours(15, 40)).toISOString(), mine: true, insertions: 42, deletions: 8, files: 2, paths: [] },
          { hash: 'e4f5g6h', author: '张三', email: 'me@example.com', subject: 'feat: 支持按仓库筛选', time: new Date(new Date().setHours(11, 5)).toISOString(), mine: true, insertions: 76, deletions: 16, files: 3, paths: [] },
          { hash: 'i7j8k9l', author: '张三', email: 'me@example.com', subject: 'perf: 优化统计加载速度', time: new Date(new Date().setHours(9, 30)).toISOString(), mine: true, insertions: 10, deletions: 0, files: 1, paths: [] },
        ],
      }],
    };
    const BG_STORAGE_KEY = 'dsh.ganleme.bg';
    const BG_DAILY_KEY = 'dsh.ganleme.bgDaily';
    /** Folder imports land in IndexedDB: localStorage cannot hold a whole album. */
    const BG_DB_NAME = 'ganleme';
    const BG_DB_STORE = 'bg';
    /** The single uploaded background, kept apart from the folder library. */
    const BG_MANUAL_STORE = 'manual';
    /** Upper bound for one folder import, keeping memory and import time sane. */
    const BG_POOL_CAP = 40;
    /** Veil layered over a user background image so content stays readable. */
    const SKINS = [
      { id: 'default', swatch: 'linear-gradient(135deg, #f5f5f7 50%, #2b2e36 50%)', veil: 'color-mix(in srgb, var(--dsw-alias-bg-base) 86%, transparent)' },
      { id: 'warm', swatch: 'linear-gradient(135deg, #f6d9b8, #d97b2c)', veil: 'rgba(246, 234, 217, 0.88)' },
      { id: 'bamboo', swatch: 'linear-gradient(135deg, #bfe3cd, #3a9d6e)', veil: 'rgba(233, 242, 236, 0.88)' },
      { id: 'mist', swatch: 'linear-gradient(135deg, #bcd6ee, #3b82c4)', veil: 'rgba(233, 239, 247, 0.88)' },
      { id: 'night', swatch: 'linear-gradient(135deg, #2b3040, #12141a)', veil: 'rgba(18, 20, 26, 0.9)' },
    ];

    function veilOf(skinId) {
      return (SKINS.find((skin) => skin.id === skinId) ?? SKINS[0]).veil;
    }

    function readStored(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }

    function writeStored(key, value) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {}
    }

    /**
     * Decode, downscale (long edge ≤ maxEdge), and JPEG-encode a background
     * image; rejects when the result would still exceed maxChars in a
     * localStorage entry.
     */
    function compressImage(file, maxEdge = 1920, quality = 0.82, maxChars = 3_000_000) {
      return new Promise((resolve, reject) => {
        let url;
        try {
          url = URL.createObjectURL(file);
        } catch (error) {
          reject(error);
          return;
        }
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('canvas unavailable'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          let data = canvas.toDataURL('image/jpeg', quality);
          if (data.length > maxChars && quality > 0.5) {
            const smaller = document.createElement('canvas');
            smaller.width = Math.round(canvas.width * 0.66);
            smaller.height = Math.round(canvas.height * 0.66);
            smaller.getContext('2d').drawImage(canvas, 0, 0, smaller.width, smaller.height);
            data = smaller.toDataURL('image/jpeg', 0.6);
          }
          if (data.length > maxChars) {
            reject(new Error('image too large'));
            return;
          }
          resolve(data);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('image decode failed'));
        };
        image.src = url;
      });
    }

    function imageFiles(fileList) {
      return Array.from(fileList ?? []).filter(
        (file) => typeof file.type === 'string' && file.type.startsWith('image/'),
      );
    }

    /** Deterministic per-local-day pick: same image all day, rotates across days. */
    function dailyIndex(length, now = new Date()) {
      if (!(length > 0)) return 0;
      const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      let hash = 0;
      for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      return hash % length;
    }

    /**
     * v1 held only the folder library (`bg`); v2 adds `manual` for the single
     * uploaded image, which used to live in localStorage and could crowd out
     * the Harness's own settings there (the origin shares one ~5 MB quota).
     */
    function bgDbOpen() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(BG_DB_NAME, 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(BG_DB_STORE)) db.createObjectStore(BG_DB_STORE);
          if (!db.objectStoreNames.contains(BG_MANUAL_STORE)) db.createObjectStore(BG_MANUAL_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('indexedDB unavailable'));
      });
    }

    /** Run one request in a fresh transaction; resolves with its result once committed. */
    async function bgDbRun(store, mode, makeRequest) {
      const db = await bgDbOpen();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = makeRequest(tx.objectStore(store));
        tx.oncomplete = () => {
          db.close();
          resolve(request?.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error(`indexedDB ${mode} failed`));
        };
      });
    }

    const bgDbPut = (key, value) => bgDbRun(BG_DB_STORE, 'readwrite', (s) => s.put(value, key));
    const bgDbGetAll = async () => (await bgDbRun(BG_DB_STORE, 'readonly', (s) => s.getAll())) ?? [];
    const bgDbClear = () => bgDbRun(BG_DB_STORE, 'readwrite', (s) => s.clear());
    const manualBgGet = async () => (await bgDbRun(BG_MANUAL_STORE, 'readonly', (s) => s.get('current'))) ?? null;
    const manualBgSet = (value) =>
      bgDbRun(BG_MANUAL_STORE, 'readwrite', (s) => (value === null ? s.delete('current') : s.put(value, 'current')));

    /**
     * The uploaded background, moving a pre-0.3 localStorage copy into
     * IndexedDB on first read so the quota is freed.
     */
    async function loadManualBg() {
      const legacy = readStored(BG_STORAGE_KEY);
      if (legacy) {
        try {
          await manualBgSet(legacy);
          writeStored(BG_STORAGE_KEY, null);
        } catch {
          return legacy; // keep showing it; retry the move next time
        }
        return legacy;
      }
      return manualBgGet();
    }

    /** Local calendar label of the stats window; `to` is exclusive. */
    function windowLabel(data) {
      const from = new Date(data.from);
      const to = new Date(new Date(data.to).getTime() - 1);
      const f = fmtDate(from);
      const t2 = fmtDate(to);
      return f === t2 ? f : `${f} ~ ${t2}`;
    }

    /**
     * Conventional-commit types stripped by `stripCommitPrefix`. Latin types
     * follow the conventional-commits spec; the CJK ones cover the common
     * Chinese writing habit (`修复: …`).
     */
    const COMMIT_TYPES = new Set([
      'feat', 'feature', 'fix', 'bugfix', 'hotfix', 'perf', 'refactor', 'refact', 'style',
      'docs', 'doc', 'test', 'tests', 'build', 'ci', 'chore', 'revert', 'release', 'wip',
      'improve', 'improvement', 'update', 'add', 'remove', 'delete', 'merge', 'init',
      'polish', 'tune', 'tweak', 'optimize', 'optimise',
      '新增', '添加', '修复', '优化', '重构', '文档', '测试', '构建', '样式', '性能',
      '杂项', '回滚', '发布', '调整', '改进', '更新', '删除', '合并', '初始化',
    ]);

    /**
     * Drop a leading `type:` / `type(scope)!:` from a commit subject.
     * The type must be a known one, so `API: add endpoint` keeps its prefix.
     * @returns the subject without the prefix, trimmed; the input when no
     *   recognised type leads it or nothing would be left.
     */
    function stripCommitPrefix(subject) {
      const text = String(subject ?? '').trim();
      const match = /^([A-Za-z]+|[\u4e00-\u9fa5]{1,4})(\([^()]*\))?!?\s*[:：]\s*(.+)$/.exec(text);
      if (!match) return text;
      const [, type, , rest] = match;
      if (!COMMIT_TYPES.has(type.toLowerCase())) return text;
      return rest.trim() || text;
    }

    /**
     * Report styles as bundles of independent switches. A style only provides
     * defaults; `overrides` flips individual switches on top of it.
     *
     * `date`/`range`/`headings`/`statsLine` shape the skeleton; `time`/
     * `author`/`lines`/`branch` shape one commit line; `stripPrefix` rewrites
     * the subject; `overviewLines` decides whether the summary sentence counts
     * added/deleted lines.
     */
    const REPORT_STYLES = {
      // The usual company daily-report entry: what was done, nothing else.
      worklog: {
        date: true, range: false, headings: false, overviewLines: false, statsLine: false,
        repoHeading: true, branch: false, time: false, author: false,
        lines: false, stripPrefix: true, numbering: 'dash',
      },
      // Worklog plus the per-repository commit count.
      brief: {
        date: true, range: false, headings: false, overviewLines: true, statsLine: false,
        repoHeading: true, branch: false, time: false, author: false,
        lines: true, stripPrefix: true, numbering: 'numbered',
      },
      // Adds clock times and a statistics line per repository.
      standard: {
        date: true, range: true, headings: true, overviewLines: true, statsLine: true,
        repoHeading: true, branch: true, time: true, author: false,
        lines: true, stripPrefix: false, numbering: 'numbered',
      },
      // Everything: authors, times, branches and line counts.
      detailed: {
        date: true, range: true, headings: true, overviewLines: true, statsLine: true,
        repoHeading: true, branch: true, time: true, author: true,
        lines: true, stripPrefix: false, numbering: 'numbered',
      },
    };
    const REPORT_STYLE_ORDER = ['worklog', 'brief', 'standard', 'detailed'];
    /** Switches a user may flip on top of the chosen style. */
    const REPORT_TOGGLES = ['stripPrefix', 'lines', 'time', 'author'];
    /** `numbering` is a separate choice, not a boolean switch. */
    const REPORT_CHOICES = [...REPORT_TOGGLES, 'numbering'];

    /**
     * How commit lines are prefixed. `marker(i)` renders item `i` (0-based);
     * `indent` is the plain-format depth under a repository heading. Items sit
     * under their heading in every style, so a group always reads as one block.
     * Numbering is per repository: a daily report listing three repositories
     * restarts at 1 under each, which is how paper reports are written.
     */
    const NUMBERING = {
      dash: { indent: '  ', marker: () => '-' },
      bullet: { indent: '  ', marker: () => '•' },
      numbered: { indent: '  ', marker: (i) => `${i + 1}.` },
      paren: { indent: '  ', marker: (i) => `${i + 1}）` },
      none: { indent: '  ', marker: () => '' },
    };
    const NUMBERING_ORDER = ['dash', 'bullet', 'numbered', 'paren', 'none'];

    /** One commit line in the chosen numbering, without the subject. */
    function formatCommitLine(commit, index, ctx) {
      const { marker, indent } = NUMBERING[ctx.numbering] ?? NUMBERING.dash;
      const label = marker(index);
      const parts = [];
      if (ctx.showAuthor) parts.push(commit.author);
      if (ctx.time) parts.push(fmtTime(commit.time));
      if (ctx.lines) parts.push(`+${commit.insertions}/-${commit.deletions}`);
      const meta = parts.join(' ');
      const body = `${commit.subject}${meta ? `（${meta}）` : ''}`;
      if (!label) return `${indent}${body}`;
      // `1.`, `1）` and `-`/`•` take one following space; `一、` already ends
      // in a wide mark that carries its own spacing.
      const sep = /^[0-9]+[.)）]$|^[-•]$/.test(label) ? ' ' : '';
      return `${indent}${label}${sep}${body}`;
    }

    /**
     * Switch to another style. Manual switches only express "differ from the
     * style's default", so they are dropped when the style changes — otherwise
     * a ticked "show times" would keep overriding the new style and the choice
     * of style would appear to do nothing. An explicit numbering choice stays:
     * it is independent of style semantics.
     */
    function withStyle(draft, style) {
      return { ...draft, style, overrides: {} };
    }

    const resolveReportSpec = (style, overrides = {}) => ({
      ...(REPORT_STYLES[style] ?? REPORT_STYLES.worklog),
      ...Object.fromEntries(
        Object.entries(overrides).filter(([key, value]) => REPORT_CHOICES.includes(key) && value !== undefined),
      ),
    });

    /**
     * Decide what a generate click does, given whether a format is confirmed
     * and whether a sheet is already open. Pure, so the first-run rules can be
     * tested without a browser.
     * @returns { action: 'generate' | 'ask', retarget: boolean }
     */
    function reportIntent({ hasConfig, sheetOpen }) {
      if (!hasConfig) return { action: 'ask', retarget: true };
      // A sheet left open is discarded on a confirmed generate.
      return { action: 'generate', retarget: false };
    }

    /**
     * Render the report from one stats payload.
     * @param t localized dictionary lookup bound to this plugin's namespace.
     * @param kind 'daily' | 'weekly' | 'monthly' | 'range'.
     * @param scope 'mine' (only the caller's own commits) or 'all'.
     * @param format 'plain' (textarea-friendly, no Markdown syntax) or 'markdown'.
     * @param options { style, overrides, limit }; `limit` 0 means every commit.
     *   `overrides.numbering` picks the commit marker (see NUMBERING).
     */
    function buildReport(t, kind, data, scope, format, options = {}) {
      const plain = format !== 'markdown';
      const spec = resolveReportSpec(options.style ?? 'worklog', {
        ...options.overrides,
        ...(options.numbering ? { numbering: options.numbering } : {}),
      });
      const limit = Number.isInteger(options.limit) && options.limit >= 0 ? options.limit : 20;
      const totals = scope === 'mine' ? data.mine : data.totals;
      const perRepo = (repo) => (scope === 'mine' ? repo.mine : repo.stats);
      // A daily report is dated by the day it covers (a report written this
      // morning for yesterday says yesterday); longer reports by when they ran.
      const date = new Date(kind === 'daily' ? data.from : data.generatedAt);
      const active = data.repos.filter((repo) => repo.ok && perRepo(repo).commits > 0);
      const failed = data.repos.filter((repo) => !repo.ok);
      const unknown = scope === 'mine' ? data.repos.filter((repo) => repo.ok && !repo.me).map((repo) => repo.title) : [];
      const lines = [];
      const scopeLabel = scope === 'mine' ? t('scope.mine') : t('scope.all');
      const overviewTemplate = spec.overviewLines ? 'report.overviewBody' : 'report.overviewBodyNoLines';
      const overviewText = fmt(t(overviewTemplate), {
        commits: totals.commits,
        additions: totals.insertions,
        deletions: totals.deletions,
        repos: totals.repos,
      });

      if (spec.date) {
        lines.push(plain ? `${t('report.title.' + kind)} · ${fmtDate(date)}` : `# ${t('report.title.' + kind)} · ${fmtDate(date)}`, '');
      }
      if (spec.range) {
        lines.push(plain ? `${t('report.rangeLabel')}：${windowLabel(data)}（${scopeLabel}）` : `> ${t('report.rangeLabel')}: ${windowLabel(data)} · ${scopeLabel}`, '');
      }
      if (spec.headings && !plain) lines.push(`## ${t('report.overview')}`);
      else if (spec.headings) lines.push(t('report.overviewPlain'));
      lines.push(overviewText, '');

      if (active.length === 0) {
        lines.push(t('report.emptyBody'));
      } else {
        if (spec.headings) lines.push(plain ? t('report.detailPlain') : `## ${t('report.detail')}`);
        // Ticked on, every line names its author; in the "mine" scope that is
        // the caller themselves, which is exactly what the toggle promises.
        const showAuthor = !!spec.author;
        // A report about one repository needs no heading above its list; the
        // numbering style then decides whether items indent or start at column 0.
        const showRepoHeadings = spec.repoHeading && active.length > 1;
        active.forEach((repo, index) => {
          const stats = perRepo(repo);
          const commits = repo.commits.filter((commit) => scope !== 'mine' || commit.mine);
          const shown = limit === 0 ? commits : commits.slice(0, limit);

          if (showRepoHeadings) {
            // Repository headings carry no number: the numbers belong to the
            // commits underneath, and a numbered heading competes with them.
            lines.push(plain
              ? `${repo.title}${spec.branch && repo.branch ? `（${repo.branch}）` : ''}`
              : `### ${repo.title}${spec.branch && repo.branch ? ` (${repo.branch})` : ''}`);
          } else if (!plain && spec.repoHeading && active.length === 1) {
            // Markdown still needs a heading-looking anchor for the list.
            lines.push(`### ${repo.title}${spec.branch && repo.branch ? ` (${repo.branch})` : ''}`);
          }
          if (spec.statsLine) {
            const line = fmt(t(spec.lines ? 'report.repoLine' : 'report.repoLineNoLines'), {
              commits: stats.commits,
              additions: stats.insertions,
              deletions: stats.deletions,
            });
            // Indent only under a heading; a heading-less single repository keeps
            // column 0, exactly like its commit items.
            const indent = showRepoHeadings ? '  ' : '';
            if (plain) {
              lines.push(`${indent}${line}`, '');
            } else {
              lines.push('', line, '');
            }
          }

          shown.forEach((commit, i) => {
            const subject = spec.stripPrefix ? stripCommitPrefix(commit.subject) : commit.subject;
            const line = formatCommitLine(
              { ...commit, subject },
              i,
              {
                numbering: spec.numbering,
                showAuthor,
                time: spec.time,
                lines: spec.lines,
              },
            );
            if (plain) {
              lines.push(showRepoHeadings ? line : line.trimStart());
            } else {
              // Markdown only understands `1.` and `-`; other markers would
              // render as literal text, so they fall back to a dash.
              const parts = [];
              if (showAuthor) parts.push(commit.author);
              if (spec.time) parts.push(fmtTime(commit.time));
              if (spec.lines) parts.push(`+${commit.insertions}/-${commit.deletions}`);
              const marker = spec.numbering === 'numbered' ? `${i + 1}.` : '-';
              lines.push(`${marker} ${subject}${parts.length ? ` — ${parts.join(' ')}` : ''}`);
            }
          });
          const hidden = commits.length - shown.length;
          if (hidden > 0) {
            const note = fmt(t('report.truncatedCount'), { n: hidden });
            lines.push(plain ? `   ${note}` : `- ${note}`);
          }
          if (plain) lines.push('');
        });
      }

      if (failed.length > 0) {
        lines.push('', plain ? t('report.errors') : `## ${t('report.errors')}`);
        for (const repo of failed) lines.push(`- ${repo.title}: ${repo.error}`);
      }
      if (unknown.length > 0) {
        const note = fmt(t('report.noIdentityNote'), { repos: unknown.join(', ') });
        lines.push('', plain ? note : `> ${note}`);
      }
      if (!plain) lines.push('', '---', fmt(t('report.footer'), { app: t('title') }));
      return lines.join('\n');
    }

    // ------------------------------------------------------------------
    // Components
    // ------------------------------------------------------------------

    /** Sidebar rail glyph; inherits the current text color. */
    function PanelIcon({ size }) {
      const edge = size ?? 20;
      return h(
        'svg',
        { width: edge, height: edge, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, style: { display: 'block' } },
        h('path', { d: 'M4.5 19h15', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
        h('path', { d: 'M7 15.5v-3.5', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
        h('path', { d: 'M12 15.5v-7', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
        h('path', { d: 'M17 15.5V9.5', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
        h('path', { d: 'm15 4 1.7 1.7L20 2.4', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      );
    }

    /**
     * Stats responses keyed by range, dropped after `ttlMs` (the Host's own
     * stats cache defaults to 60 s). Without expiry a page left open all day
     * kept showing the morning's numbers until someone clicked refresh.
     */
    function createStatsCache(ttlMs = 60_000, now = () => Date.now()) {
      const entries = new Map();
      return {
        get(key) {
          const hit = entries.get(key);
          if (!hit) return undefined;
          if (now() - hit.at > ttlMs) {
            entries.delete(key);
            return undefined;
          }
          return hit.value;
        },
        set(key, value) {
          entries.set(key, { value, at: now() });
        },
        clear() {
          entries.clear();
        },
      };
    }

    const RANGES = ['today', 'yesterday', 'week', 'month', 'custom'];
    const CUSTOM_PRESETS = ['last7', 'last30', 'lastWeek', 'lastMonth'];
    const REPORT_KINDS = [
      { kind: 'daily', key: 'report.daily', range: 'today' },
      { kind: 'weekly', key: 'report.weekly', range: 'week' },
      { kind: 'monthly', key: 'report.monthly', range: 'month' },
    ];

    /** One repository statistics card; click toggles the commit list. */
    function RepoCard({ repo, scope, expanded, onToggle, t }) {
      if (!repo.ok) {
        return h(
          'div',
          { className: 'gl-card' },
          h(
            'div',
            { className: 'gl-cardHead', style: { cursor: 'default' } },
            h('span', { className: 'gl-repo' }, repo.title),
            h('span', { className: 'gl-chip' }, t('source.' + repo.source)),
            h('span', { className: 'gl-cardStats' }, h('span', { className: 'gl-caret' }, '×')),
          ),
          h('div', { className: 'gl-repoError' }, repo.error),
        );
      }
      const stats = scope === 'mine' ? repo.mine : repo.stats;
      const commits = repo.commits.filter((commit) => scope !== 'mine' || commit.mine);
      const shown = commits.slice(0, expanded ? 200 : 5);
      return h(
        'div',
        { className: 'gl-card' },
        h(
          'div',
          {
            className: 'gl-cardHead',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': expanded,
            onClick: onToggle,
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            },
          },
          h('span', { className: 'gl-repo' }, repo.title),
          repo.branch ? h('span', { className: 'gl-chip' }, repo.branch) : null,
          h('span', { className: 'gl-chip' }, t('source.' + repo.source)),
          scope === 'mine' && !repo.me
            ? h('span', { className: 'gl-chip gl-chipWarn', title: t('emptyHint.mine') }, t('repo.noIdentity'))
            : null,
          repo.truncated
            ? h('span', { className: 'gl-chip gl-chipWarn', title: t('repo.truncatedHint') }, t('repo.truncated'))
            : null,
          h(
            'span',
            { className: 'gl-cardStats' },
            stats.commits > 0 ? h('span', { className: 'gl-add' }, `+${fmtNum(stats.insertions)}`) : null,
            stats.commits > 0 ? h('span', { className: 'gl-del' }, `-${fmtNum(stats.deletions)}`) : null,
            h('span', null, fmt(t('card.commits'), { n: stats.commits })),
            h('span', { className: 'gl-caret' }, expanded ? '▾' : '▸'),
          ),
        ),
        h('div', { className: 'gl-cardPath', title: repo.path }, repo.path),
        expanded
          ? h(
              'div',
              { className: 'gl-cardBody' },
              stats.authors.length > 0
                ? h(
                    'div',
                    { className: 'gl-authorsLine' },
                    `${t('authors.label')}: ` +
                      stats.authors
                        .slice(0, 3)
                        .map((a) => `${a.name} ×${a.count}`)
                        .join(', ') +
                      (stats.authors.length > 3 ? fmt(t('authors.more'), { n: stats.authors.length - 3 }) : ''),
                  )
                : null,
              shown.map((commit) =>
                h(
                  'div',
                  { className: 'gl-commit', key: commit.hash + commit.time },
                  h('span', { className: 'gl-hash' }, commit.hash),
                  h('span', { className: 'gl-subject', title: commit.subject }, commit.subject),
                  h(
                    'span',
                    { className: 'gl-commitMeta' },
                    `${commit.author} ${fmtTime(commit.time)}`,
                    ' ',
                    h('span', { className: 'gl-add' }, `+${commit.insertions}`),
                    '/',
                    h('span', { className: 'gl-del' }, `-${commit.deletions}`),
                  ),
                ),
              ),
              stats.commits > shown.length
                ? h('div', { className: 'gl-more' }, fmt(t('commits.more'), { n: stats.commits - shown.length }))
                : null,
            )
          : null,
      );
    }

    /** The report modal: generated report with scope/format/level toggles and copy. */
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    /**
     * Modal focus: move focus into the dialog when it opens, keep Tab and
     * Shift+Tab inside it, and give focus back to the opener when it closes.
     */
    function useDialogFocus() {
      const ref = React.useRef(null);
      React.useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return undefined;
        const opener = typeof document !== 'undefined' ? document.activeElement : null;
        const items = () => Array.from(dialog.querySelectorAll(FOCUSABLE));
        (items()[0] ?? dialog).focus?.();
        const onKey = (e) => {
          if (e.key !== 'Tab') return;
          const list = items();
          if (list.length === 0) {
            e.preventDefault();
            return;
          }
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && (active === first || !dialog.contains(active))) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
            e.preventDefault();
            first.focus();
          }
        };
        dialog.addEventListener('keydown', onKey);
        return () => {
          dialog.removeEventListener('keydown', onKey);
          if (opener && typeof opener.focus === 'function' && document.contains?.(opener)) opener.focus();
        };
      }, []);
      return ref;
    }

    function ReportModal({ report, onClose, onCopy, copied, onSettings, onPolish, canPolish, showOriginal, onToggleOriginal, notice, t }) {
      const dialogRef = useDialogFocus();
      return h(
        'div',
        {
          className: 'gl-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) onClose();
          },
        },
        h(
          'div',
          { ref: dialogRef, tabIndex: -1, className: 'gl-modal', role: 'dialog', 'aria-modal': true, 'aria-label': t('report.title.' + report.kind) },
          h(
            'div',
            { className: 'gl-modalHead' },
            h('h2', { className: 'gl-modalTitle' }, t('report.title.' + report.kind)),
            report.data ? h('span', { className: 'gl-modalRange' }, windowLabel(report.data)) : null,
            notice ? h('span', { className: 'gl-chip gl-chipOk' }, notice) : null,
            h('span', { style: { marginLeft: 'auto' } }),
            // Only offered once a rewrite exists: the original is never lost.
            report.polished
              ? h(
                  'div',
                  { className: 'gl-tabs' },
                  ['polished', 'original'].map((id) =>
                    h(
                      'button',
                      {
                        key: id,
                        className: 'gl-tab',
                        'aria-pressed': (id === 'original') === showOriginal,
                        'data-active': (id === 'original') === showOriginal,
                        onClick: () => onToggleOriginal(id === 'original'),
                      },
                      t('report.view.' + id),
                    ),
                  ),
                )
              : null,
            canPolish
              ? h('button', { className: 'gl-btn', disabled: !polishSource(report), onClick: onPolish }, t('polish.title'))
              : null,
            h('button', { className: 'gl-iconBtn', 'aria-label': t('report.settings'), title: t('report.settings'), onClick: onSettings }, h(GearIcon)),
            h('button', { className: 'gl-btn', onClick: onClose }, t('report.close')),
          ),
          report.error
            ? h('div', { className: 'gl-pre' }, `${t('report.failed')}: ${report.error}`)
            : (showOriginal ? report.original : report.text)
              ? h('pre', { className: 'gl-pre' }, showOriginal ? report.original : report.text)
              : h('div', { className: 'gl-pre gl-preLoading' }, h(LoadingGlyph, { size: 72, label: t('report.generating') })),
          h(
            'div',
            { className: 'gl-modalFoot' },
            h(
              'button',
              { className: 'gl-btn', disabled: !report.text, onClick: onCopy },
              copied ? t('report.copied') : t('report.copy'),
            ),
            h('button', { className: 'gl-btn', onClick: onClose }, t('report.close')),
          ),
        ),
      );
    }

    /**
     * The plugin's waiting indicator: three bars growing in turn, a small figure
     * dozing on the tallest one, and a fish swimming past. Pure SVG so it renders
     * inside any slot; the animation lives in the stylesheet (`.gl-load`), so the
     * component stays a static tree.
     * @param props.size edge length in px; props.label drawn beside it.
     */
    function LoadingGlyph({ size = 56, label }) {
      // Gradient ids are document-global; a single hidden instance defines them
      // once so two loaders on one page cannot fight over the same id.
      const gradientId = (name) => `${name}-${PACKAGE.replace(/[^a-z0-9]/gi, '')}`;
      return h(
        'div',
        { className: 'gl-load', role: 'status', 'aria-live': 'polite' },
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true, className: 'gl-loadArt' },
          h(
            'defs',
            null,
            h('linearGradient', { id: gradientId('glLoadBar1'), x1: 0, y1: 0, x2: 0, y2: 1 },
              h('stop', { offset: 0, stopColor: '#34d9f2' }), h('stop', { offset: 1, stopColor: '#0e9cc4' })),
            h('linearGradient', { id: gradientId('glLoadBar2'), x1: 0, y1: 0, x2: 0, y2: 1 },
              h('stop', { offset: 0, stopColor: '#5fa2f7' }), h('stop', { offset: 1, stopColor: '#2f5fe0' })),
            h('linearGradient', { id: gradientId('glLoadBar3'), x1: 0, y1: 0, x2: 0, y2: 1 },
              h('stop', { offset: 0, stopColor: '#b78efc' }), h('stop', { offset: 1, stopColor: '#7c46e8' })),
          ),
          // Bars: each grows and settles on its own delay.
          h('rect', { className: 'gl-loadBar', 'data-bar': '1', x: 12, y: 30, width: 9, height: 22, rx: 3, fill: `url(#${gradientId('glLoadBar1')})` }),
          h('rect', { className: 'gl-loadBar', 'data-bar': '2', x: 26, y: 22, width: 9, height: 30, rx: 3, fill: `url(#${gradientId('glLoadBar2')})` }),
          h('rect', { className: 'gl-loadBar', 'data-bar': '3', x: 40, y: 12, width: 9, height: 40, rx: 3, fill: `url(#${gradientId('glLoadBar3')})` }),
          // The dozing figure rides the tallest bar.
          h('g', { className: 'gl-loadSleeper' },
            h('rect', { x: 44, y: 12, width: 8, height: 4.4, rx: 2.2, fill: '#eef4ff' }),
            h('circle', { cx: 44.6, cy: 9.4, r: 3.1, fill: '#ffffff' }),
          ),
          h('g', { className: 'gl-loadZzz' },
            h('path', { d: 'M53 12h4.4l-4.4 4.4H57', stroke: '#bfe0ff', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }),
            h('path', { d: 'M56.5 6.5h3l-3 3h3', stroke: '#bfe0ff', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', opacity: 0.7 }),
          ),
          // A fish swims across the bottom, bubbles trailing.
          h('g', { className: 'gl-loadFish' },
            h('ellipse', { cx: 20, cy: 55, rx: 5, ry: 3, fill: '#6fe6f7' }),
            h('path', { d: 'M24.6 55L28 52.8v4.4Z', fill: '#6fe6f7' }),
            h('circle', { cx: 18, cy: 54.2, r: 0.8, fill: '#0c1428' }),
          ),
          h('circle', { className: 'gl-loadBubble', 'data-b': '1', cx: 28, cy: 51, r: 1.3, fill: '#7de3f5' }),
          h('circle', { className: 'gl-loadBubble', 'data-b': '2', cx: 31, cy: 48, r: 1, fill: '#7de3f5' }),
        ),
        label ? h('span', { className: 'gl-loadLabel' }, label) : null,
      );
    }

    /**
     * Rotating waiting copy, so a long wait does not repeat one flat sentence.
     * @param lines localized strings shown in order.
     * @returns the current line; changes on a timer owned by the caller.
     */
    function useRotatingText(lines, intervalMs = 2200, active = true) {
      const [index, setIndex] = React.useState(0);
      React.useEffect(() => {
        if (!active || lines.length < 2) return undefined;
        const timer = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
        return () => clearInterval(timer);
      }, [active, lines.length, intervalMs]);
      return lines[index % lines.length];
    }

    /** Gear glyph: opens the report format settings. */
    function GearIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 3.1, stroke: 'currentColor', 'stroke-width': 1.9 }),
        h('path', {
          d: 'M19.4 13.5a7.6 7.6 0 0 0 0-3l1.6-1.2-1.9-3.3-1.9.8a7.5 7.5 0 0 0-2.6-1.5L14.3 3h-3.8l-.3 2.3a7.5 7.5 0 0 0-2.6 1.5l-1.9-.8L3.8 9.3L5.4 10.5a7.6 7.6 0 0 0 0 3L3.8 14.7l1.9 3.3 1.9-.8a7.5 7.5 0 0 0 2.6 1.5l.3 2.3h3.8l.3-2.3a7.5 7.5 0 0 0 2.6-1.5l1.9.8 1.9-3.3-1.6-1.2Z',
          stroke: 'currentColor',
          'stroke-width': 1.7,
          'stroke-linejoin': 'round',
        }),
      );
    }

    /**
     * Report format settings: a full sheet of grouped choices with a live
     * preview. It opens on the first generate (nothing saved yet) and any time
     * the gear in the report window is pressed; saving persists every choice.
     */
    function ReportSettings({
      draft, onDraft, preview, firstRun, onSave, onCancel, t,
    }) {
      const dialogRef = useDialogFocus();
      const choice = (key, id, label, hint) =>
        h(
          'button',
          {
            key: id,
            className: 'gl-choice',
            'aria-pressed': draft[key] === id,
            'data-active': draft[key] === id,
            title: hint,
            onClick: () => onDraft({ ...draft, [key]: id }),
          },
          label,
        );
      const section = (title, hint, children) =>
        h(
          'section',
          { className: 'gl-setSection' },
          h('div', { className: 'gl-setHead' },
            h('h3', { className: 'gl-setTitle' }, title),
            hint ? h('p', { className: 'gl-setHint' }, hint) : null),
          children,
        );
      return h(
        'div',
        {
          className: 'gl-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) onCancel();
          },
        },
        h(
          'div',
          {
            ref: dialogRef,
            tabIndex: -1,
            className: 'gl-modal gl-modalWide',
            role: 'dialog',
            'aria-modal': true,
            'aria-label': t('report.firstRun.title'),
          },
          h(
            'div',
            { className: 'gl-modalHead' },
            h('h2', { className: 'gl-modalTitle' }, t(firstRun ? 'report.firstRun.title' : 'report.settings')),
            firstRun ? h('span', { className: 'gl-chip' }, t('report.firstRun.badge')) : null,
            h('span', { style: { marginLeft: 'auto' } }),
            h('button', { className: 'gl-btn', onClick: onCancel }, t('report.firstRun.cancel')),
          ),
          h(
            'div',
            { className: 'gl-setBody' },
            h(
              'div',
              { className: 'gl-setForm' },
              firstRun ? h('p', { className: 'gl-setIntro' }, t('report.firstRun.intro')) : null,
              section(
                t('report.style'),
                t('report.styleHint'),
                h(
                  'div',
                  { className: 'gl-choiceGrid' },
                  REPORT_STYLE_ORDER.map((id) =>
                    h(
                      'button',
                      {
                        key: id,
                        className: 'gl-styleCard',
                        'aria-pressed': draft.style === id,
                        'data-active': draft.style === id,
                        onClick: () => onDraft(withStyle(draft, id)),
                      },
                      h('span', { className: 'gl-styleName' }, t('report.style.' + id)),
                      h('span', { className: 'gl-styleHint' }, t('report.style.' + id + '.hint')),
                    ),
                  ),
                ),
              ),
              section(
                t('report.numbering'),
                t('report.numberingHint'),
                h(
                  'div',
                  { className: 'gl-choiceGrid gl-choiceGridTight' },
                  NUMBERING_ORDER.map((id) =>
                    choice('numbering', id, t('report.numbering.' + id), t('report.numbering.' + id + '.hint')),
                  ),
                ),
              ),
              section(
                t('report.limit'),
                t('report.limitHint'),
                h(
                  'div',
                  { className: 'gl-choiceGrid gl-choiceGridTight' },
                  [20, 50, 0].map((n) => choice('limit', n, n === 0 ? t('report.limit.all') : fmt(t('report.limit.n'), { n }))),
                ),
              ),
              section(
                t('report.advanced'),
                t('report.advancedHint'),
                h(
                  'div',
                  { className: 'gl-toggleRow' },
                  REPORT_TOGGLES.map((key) =>
                    h(
                      'label',
                      { key, className: 'gl-check', title: t('report.toggle.' + key + '.hint') },
                      h('input', {
                        type: 'checkbox',
                        checked: !!draft.overrides[key],
                        onChange: (e) => onDraft({ ...draft, overrides: { ...draft.overrides, [key]: e.target.checked } }),
                      }),
                      h('span', null, t('report.toggle.' + key)),
                    ),
                  ),
                ),
              ),
              section(
                t('report.format.markdown'),
                t('report.formatHint'),
                h(
                  'div',
                  { className: 'gl-choiceGrid gl-choiceGridTight' },
                  ['plain', 'markdown'].map((id) => choice('format', id, t('report.format.' + id), t('report.format.' + id + '.hint'))),
                ),
              ),
              section(
                t('scope.all'),
                t('report.scopeHint'),
                h(
                  'div',
                  { className: 'gl-choiceGrid gl-choiceGridTight' },
                  ['mine', 'all'].map((id) => choice('scope', id, t('scope.' + id), t('scope.' + id + '.hint'))),
                ),
              ),
            ),
            h(
              'aside',
              { className: 'gl-setPreview' },
              h('div', { className: 'gl-setPreviewHead' }, t('report.preview')),
              h('pre', { className: 'gl-setPreviewBody' }, preview),
            ),
          ),
          h(
            'div',
            { className: 'gl-modalFoot' },
            h(
              'button',
              { className: 'gl-btn', onClick: onCancel },
              t('report.firstRun.cancel'),
            ),
            h(
              'button',
              { className: 'gl-btn gl-btnPrimary', onClick: onSave },
              t(firstRun ? 'report.firstRun.save' : 'report.settings.save'),
            ),
          ),
        ),
      );
    }


    /**
     * AI polish sheet: pick a rewrite level and tone, watch the model stream,
     * then edit the result before applying it. The original stays untouched
     * until "apply", and the number guard runs again on the edited text.
     */
    function PolishSheet({
      draft, onDraft, phase, output, onOutput, error, onStart, onStop, onApply, onCancel, t,
    }) {
      const dialogRef = useDialogFocus();
      const streaming = phase === 'streaming';
      const canApply = phase === 'ready' || phase === 'stopped';
      const levelCard = (id) =>
        h(
          'button',
          {
            key: id,
            className: 'gl-styleCard',
            'aria-pressed': draft.level === id,
            'data-active': draft.level === id,
            disabled: streaming,
            onClick: () => onDraft({ ...draft, level: id }),
          },
          h('span', { className: 'gl-styleName' }, t('polish.level.' + id)),
          h('span', { className: 'gl-styleHint' }, t('polish.level.' + id + '.hint')),
        );
      return h(
        'div',
        {
          className: 'gl-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) onCancel();
          },
        },
        h(
          'div',
          { ref: dialogRef, tabIndex: -1, className: 'gl-modal gl-modalWide', role: 'dialog', 'aria-modal': true, 'aria-label': t('polish.title') },
          h(
            'div',
            { className: 'gl-modalHead' },
            h('h2', { className: 'gl-modalTitle' }, t('polish.title')),
            streaming ? h('span', { className: 'gl-chip' }, t('polish.streaming')) : null,
            h('span', { style: { marginLeft: 'auto' } }),
            h('button', { className: 'gl-btn', onClick: onCancel }, t('polish.cancel')),
          ),
          h(
            'div',
            { className: 'gl-setBody' },
            h(
              'div',
              { className: 'gl-setForm' },
              h(
                'section',
                { className: 'gl-setSection' },
                h('div', { className: 'gl-setHead' },
                  h('h3', { className: 'gl-setTitle' }, t('polish.level')),
                  h('p', { className: 'gl-setHint' }, t('polish.levelHint'))),
                h('div', { className: 'gl-choiceGrid' }, POLISH_LEVELS.map(levelCard)),
              ),
              h(
                'section',
                { className: 'gl-setSection' },
                h('div', { className: 'gl-setHead' }, h('h3', { className: 'gl-setTitle' }, t('polish.tone'))),
                h(
                  'div',
                  { className: 'gl-choiceGrid gl-choiceGridTight' },
                  POLISH_TONES.map((id) =>
                    h(
                      'button',
                      {
                        key: id,
                        className: 'gl-choice',
                        'aria-pressed': draft.tone === id,
                        'data-active': draft.tone === id,
                        disabled: streaming,
                        onClick: () => onDraft({ ...draft, tone: id }),
                      },
                      t('polish.tone.' + id),
                    ),
                  ),
                ),
              ),
              h(
                'section',
                { className: 'gl-setSection' },
                h('div', { className: 'gl-setHead' }, h('h3', { className: 'gl-setTitle' }, t('polish.note'))),
                h('textarea', {
                  className: 'gl-textarea',
                  rows: 2,
                  placeholder: t('polish.noteHint'),
                  value: draft.note,
                  disabled: streaming,
                  onChange: (e) => onDraft({ ...draft, note: e.target.value }),
                }),
              ),
              h(
                'details',
                { className: 'gl-details' },
                h('summary', null, t('polish.prompt')),
                h('p', { className: 'gl-setHint' }, t('polish.promptHint')),
                h('textarea', {
                  className: 'gl-textarea gl-textareaMono',
                  rows: 8,
                  value: draft.system,
                  onChange: (e) => onDraft({ ...draft, system: e.target.value }),
                }),
                h(
                  'button',
                  { className: 'gl-btn', onClick: () => onDraft({ ...draft, system: '' }) },
                  t('polish.promptReset'),
                ),
              ),
            ),
            h(
              'aside',
              { className: 'gl-setPreview' },
              h('div', { className: 'gl-setPreviewHead' }, t('polish.result')),
              canApply
                ? h('textarea', {
                    className: 'gl-textarea gl-textareaFill',
                    value: output,
                    onChange: (e) => onOutput(e.target.value),
                    'aria-label': t('polish.result'),
                  })
                : output
                  ? h('pre', { className: 'gl-setPreviewBody' }, output)
                  : streaming
                    ? h('div', { className: 'gl-setPreviewBody gl-preLoading' }, h(LoadingGlyph, { size: 56, label: t('polish.waiting') }))
                    : h('pre', { className: 'gl-setPreviewBody' }, t('polish.idle')),
            ),
          ),
          h(
            'div',
            { className: 'gl-modalFoot' },
            error ? h('span', { className: 'gl-dateError', role: 'alert', style: { marginRight: 'auto' } }, error) : null,
            streaming
              ? h('button', { className: 'gl-btn', onClick: onStop }, t('polish.stop'))
              : h('button', { className: 'gl-btn', onClick: onStart }, t('polish.start')),
            h('button', { className: 'gl-btn', onClick: onCancel }, t('polish.cancel')),
            h(
              'button',
              { className: 'gl-btn gl-btnPrimary', disabled: !canApply || !String(output ?? '').trim(), onClick: onApply },
              t('polish.apply'),
            ),
          ),
        ),
      );
    }

    /** Skin & background popover: swatches, image upload, folder library, daily random. */
    function SkinModal({
      skin, onSkin, daily, onDaily, hasManual, poolCount, importState, message,
      onUpload, onFolder, onClearManual, onClearPool, onClose, t,
    }) {
      const fileRef = React.useRef(null);
      const folderRef = React.useRef(null);
      const dialogRef = useDialogFocus();
      const busy = !!importState;
      return h(
        'div',
        {
          className: 'gl-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) onClose();
          },
        },
        h(
          'div',
          { ref: dialogRef, tabIndex: -1, className: 'gl-modal', role: 'dialog', 'aria-modal': true, 'aria-label': t('skin.title') },
          h(
            'div',
            { className: 'gl-modalHead' },
            h('h2', { className: 'gl-modalTitle' }, t('skin.title')),
            h('span', { style: { marginLeft: 'auto' } }),
            h('button', { className: 'gl-btn', onClick: onClose }, t('report.close')),
          ),
          h(
            'div',
            { style: { padding: '16px 18px 18px', overflowY: 'auto' } },
            h('div', { className: 'gl-skinSection' }, t('skin.label')),
            h(
              'div',
              { className: 'gl-skinRow' },
              SKINS.map((entry) =>
                h('button', {
                  key: entry.id,
                  className: 'gl-swatch',
                  'data-active': skin === entry.id,
                  'aria-pressed': skin === entry.id,
                  'aria-label': t('skin.' + entry.id),
                  title: t('skin.' + entry.id),
                  style: { background: entry.swatch },
                  onClick: () => onSkin(entry.id),
                }),
              ),
            ),
            h('div', { className: 'gl-skinSection' }, t('skin.title')),
            h(
              'div',
              { className: 'gl-skinRow' },
              h('button', { className: 'gl-btn', disabled: busy, onClick: () => fileRef.current?.click() }, t('skin.uploadOne')),
              h('button', { className: 'gl-btn', disabled: busy, onClick: () => folderRef.current?.click() }, t('skin.pickFolder')),
              h(
                'span',
                { className: 'gl-skinRow', style: { marginLeft: '8px' } },
                h('span', { className: 'gl-skinRowLabel' }, t('skin.dailyRandom')),
                h('button', {
                  className: 'gl-switch',
                  role: 'switch',
                  'aria-checked': daily,
                  'aria-label': t('skin.dailyRandom'),
                  'data-checked': daily,
                  disabled: busy,
                  onClick: () => onDaily(!daily),
                }),
              ),
            ),
            importState
              ? h(
                  'div',
                  { className: 'gl-skinStatus gl-importing' },
                  h(LoadingGlyph, { size: 34 }),
                  h(
                    'div',
                    { className: 'gl-importingText' },
                    h('span', null, fmt(t('skin.importing'), { done: importState.done, total: importState.total })),
                    h(
                      'div',
                      {
                        className: 'gl-progress',
                        role: 'progressbar',
                        'aria-valuemin': 0,
                        'aria-valuemax': importState.total,
                        'aria-valuenow': importState.done,
                      },
                      h('div', {
                        className: 'gl-progressFill',
                        style: { width: `${Math.round((importState.done / Math.max(1, importState.total)) * 100)}%` },
                      }),
                    ),
                  ),
                )
              : h(
                  'div',
                  { className: 'gl-skinStatus' },
                  [
                    daily && poolCount === 0 ? t('skin.needPool') : poolCount > 0 ? fmt(t('skin.poolCount'), { n: poolCount }) : '',
                    message,
                  ]
                    .filter(Boolean)
                    .join('  ')
                    .trim() || '',
                ),
            h(
              'div',
              { className: 'gl-skinRow', style: { marginTop: '12px' } },
              hasManual && !daily
                ? h('button', { className: 'gl-btn', disabled: busy, onClick: onClearManual }, t('skin.clearBg'))
                : null,
              poolCount > 0
                ? h('button', { className: 'gl-btn', disabled: busy, onClick: onClearPool }, t('skin.clearPool'))
                : null,
            ),
            h('input', {
              ref: fileRef,
              type: 'file',
              accept: 'image/*',
              style: { display: 'none' },
              onChange: (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) onUpload(file);
                e.target.value = '';
              },
            }),
            h('input', {
              ref: folderRef,
              type: 'file',
              multiple: true,
              webkitdirectory: 'true',
              directory: 'true',
              style: { display: 'none' },
              onChange: (e) => {
                if (e.target.files && e.target.files.length > 0) onFolder(e.target.files);
                e.target.value = '';
              },
            }),
          ),
        ),
      );
    }

    /** Blue download glyph for the remote-update entry; alerts on new versions. */
    function UpdateIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 4V13', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
        h('path', { d: 'M8 9L12 13L16 9', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M5.5 19H18.5', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      );
    }

    /** Circular-arrows glyph for the stats refresh action. */
    function RefreshIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3 12A9 9 0 0 1 12 3C14.7 3 17.1 4.2 18.7 6.1L21 8.5', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M21 3V8.5H15.5', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M21 12A9 9 0 0 1 12 21C9.3 21 6.9 19.8 5.3 17.9L3 15.5', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M3 21V15.5H8.5', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      );
    }

    /** Palette glyph for the skin entry. */
    function PaletteIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 8.6, stroke: 'currentColor', 'stroke-width': 2 }),
        h('circle', { cx: 9.2, cy: 10, r: 1.4, fill: 'currentColor' }),
        h('circle', { cx: 14.8, cy: 10, r: 1.4, fill: 'currentColor' }),
        h('circle', { cx: 12, cy: 14.6, r: 1.4, fill: 'currentColor' }),
      );
    }

    /** Folder-with-plus glyph for adding extra project sources. */
    function FolderPlusIcon() {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3.5 7A1.5 1.5 0 0 1 5 5.5H9.2L11.2 7.5H19A1.5 1.5 0 0 1 20.5 9V17A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V7Z', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
        h('path', { d: 'M12 10.5V14.5M10 12.5H14', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      );
    }

    /** Project-sources popover: pick directories and manage the extra roots. */
    function ProjectsModal({ roots, busy, message, onAdd, onRemove, onClose, t }) {
      const dialogRef = useDialogFocus();
      return h(
        'div',
        {
          className: 'gl-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) onClose();
          },
        },
        h(
          'div',
          { ref: dialogRef, tabIndex: -1, className: 'gl-modal', role: 'dialog', 'aria-modal': true, 'aria-label': t('projects.title') },
          h(
            'div',
            { className: 'gl-modalHead' },
            h('h2', { className: 'gl-modalTitle' }, t('projects.title')),
            h('span', { style: { marginLeft: 'auto' } }),
            h('button', { className: 'gl-btn', onClick: onClose }, t('report.close')),
          ),
          h(
            'div',
            { style: { padding: '16px 18px 18px', overflowY: 'auto' } },
            h('div', { className: 'gl-skinRow' }, h('button', { className: 'gl-btn', disabled: busy, onClick: onAdd }, t('projects.add'))),
            h('div', { className: 'gl-skinStatus' }, t('projects.hint')),
            roots !== null
              ? roots.length > 0
                ? h(
                    'div',
                    { style: { marginTop: '10px' } },
                    roots.map((root) =>
                      h(
                        'div',
                        { className: 'gl-rootRow', key: root },
                        h('span', { className: 'gl-rootPath', title: root }, root),
                        h('button', { className: 'gl-btn', disabled: busy, onClick: () => onRemove(root) }, t('projects.remove')),
                      ),
                    ),
                  )
                : h('div', { className: 'gl-skinStatus', style: { marginTop: '10px' } }, t('projects.empty'))
              : null,
            message ? h('div', { className: 'gl-skinStatus', style: { marginTop: '8px' } }, message) : null,
          ),
        ),
      );
    }

    /** The full-page dashboard bound to the `ganleme` main-panel key. */
    function DashboardPage({ t, addRootPick, addRoot, removeRoot, loadRoots, localeId }) {
      const [range, setRange] = React.useState('today');
      const [customRange, setCustomRange] = React.useState(() => presetRange('last7'));
      const todayStr = fmtDate(new Date());
      const customError = range === 'custom' ? customRangeError(customRange.from, customRange.to) : null;
      /** Cache key and stats URL for the active view; null while a custom range is invalid. */
      const statsKey = range === 'custom' ? (customError ? null : `custom:${customRange.from}..${customRange.to}`) : range;
      const statsUrl =
        range === 'custom'
          ? `ganleme/stats?range=custom&from=${encodeURIComponent(customRange.from)}&to=${encodeURIComponent(customRange.to)}`
          : `ganleme/stats?range=${range}`;
      const [scope, setScope] = React.useState('all');
      /** Saved report format, or null until the user confirms it once. */
      const [reportConfig, setReportConfig] = React.useState(readReportConfig);
      /** Unsaved edits inside the settings sheet. */
      const [draftConfig, setDraftConfig] = React.useState(null);
      /** Pending report request waiting for the format to be confirmed. */
      const pendingReportRef = React.useRef(null);
      /** AI polish sheet: null when closed. */
      const [polish, setPolish] = React.useState(null);
      const polishAbortRef = React.useRef(null);
      /** Show the untouched original while a rewrite is in place. */
      const [showOriginal, setShowOriginal] = React.useState(false);
      /** Whether the Host can polish at all (no llm service ⇒ no button). */
      const [canPolish, setCanPolish] = React.useState(false);
      /** Transient confirmation shown beside the report header. */
      const [polishNotice, setPolishNotice] = React.useState('');
      const polishNoticeTimer = React.useRef(null);
      const [skin, setSkin] = React.useState(() => readStored(SKIN_STORAGE_KEY) ?? 'default');
      const [skinOpen, setSkinOpen] = React.useState(false);
      const [dailyRandom, setDailyRandom] = React.useState(() => readStored(BG_DAILY_KEY) === '1');
      const [manualBg, setManualBg] = React.useState(null);
      const [poolCount, setPoolCount] = React.useState(0);
      const [importState, setImportState] = React.useState(null);
      const [skinMsg, setSkinMsg] = React.useState('');
      const [rootsOpen, setRootsOpen] = React.useState(false);
      const [roots, setRoots] = React.useState(null);
      const [rootsBusy, setRootsBusy] = React.useState(false);
      const [rootsMsg, setRootsMsg] = React.useState('');
      const [payload, setPayload] = React.useState(null);
      const [phase, setPhase] = React.useState('loading');
      /** Rotating copy under the loading art; the jokes match the theme. */
      const loadingText = useRotatingText(
        [t('loading'), t('loading.2'), t('loading.3'), t('loading.4')],
        2400,
        phase === 'loading',
      );
      const [todayStats, setTodayStats] = React.useState(null);
      const [quip, setQuip] = React.useState(null);
      const quipDeckRef = React.useRef({});
      const [canUpdate, setCanUpdate] = React.useState(false);
      const [updateState, setUpdateState] = React.useState(null);
      const [updateLatest, setUpdateLatest] = React.useState(null);
      const [errorText, setErrorText] = React.useState('');
      const [expanded, setExpanded] = React.useState(() => new Set());
      const [report, setReport] = React.useState(null);
      const [copied, setCopied] = React.useState(false);
      const [tick, setTick] = React.useState(0);
      const cacheRef = React.useRef(null);
      if (cacheRef.current === null) cacheRef.current = createStatsCache();
      const copyTimer = React.useRef(null);
      const skinMsgTimer = React.useRef(null);
      const updateTimer = React.useRef(null);
      const poolRef = React.useRef([]);

      React.useEffect(() => {
        let alive = true;
        fetchJson('ganleme/meta')
          .then((meta) => {
            if (alive) setCanPolish(!!meta.polish);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, []);

      React.useEffect(() => {
        let alive = true;
        if (statsKey === null) {
          // Invalid custom range: show the inline error, keep no stale numbers.
          setPayload(null);
          setPhase('invalid');
          setErrorText('');
          return;
        }
        const cached = cacheRef.current.get(statsKey);
        if (cached) {
          setPayload(cached);
          setPhase('ready');
          setErrorText('');
          return;
        }
        setPayload(null);
        setPhase('loading');
        setErrorText('');
        fetchJson(statsUrl)
          .then((data) => {
            if (!alive) return;
            cacheRef.current.set(statsKey, data);
            setPayload(data);
            setPhase('ready');
          })
          .catch((error) => {
            if (!alive) return;
            setErrorText(String(error?.message ?? error));
            setPhase('error');
          });
        return () => {
          alive = false;
        };
      }, [statsKey, tick]);

      // Coming back to a page left open: refetch once the cached numbers are stale.
      React.useEffect(() => {
        const onFocus = () => {
          if (statsKey !== null && cacheRef.current.get(statsKey) === undefined) setTick((x) => x + 1);
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
      }, [statsKey]);

      React.useEffect(() => {
        if (!report) return;
        const onKey = (e) => {
          if (e.key === 'Escape') setReport(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [report]);

      React.useEffect(
        () => () => {
          if (copyTimer.current) clearTimeout(copyTimer.current);
          if (skinMsgTimer.current) clearTimeout(skinMsgTimer.current);
          if (updateTimer.current) clearTimeout(updateTimer.current);
          if (polishNoticeTimer.current) clearTimeout(polishNoticeTimer.current);
        },
        [],
      );

      React.useEffect(() => {
        let alive = true;
        fetchJson('ganleme/meta')
          .then((meta) => {
            if (alive) setCanUpdate(!!meta.update);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, []);

      // Probe the registry on load and on every stats refresh, so the download
      // icon can highlight itself before the user ever clicks it.
      React.useEffect(() => {
        if (!canUpdate) return;
        let alive = true;
        fetchJson('ganleme/update')
          .then((status) => {
            if (alive) setUpdateLatest(status.updateAvailable ? status.latest : null);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, [canUpdate, tick]);

      React.useEffect(() => {
        let alive = true;
        bgDbGetAll()
          .then((items) => {
            if (!alive) return;
            poolRef.current = Array.isArray(items) ? items : [];
            setPoolCount(poolRef.current.length);
          })
          .catch(() => {});
        loadManualBg()
          .then((data) => {
            if (alive && data) setManualBg(data);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, []);

      React.useEffect(() => {
        if (!skinOpen) return;
        const onKey = (e) => {
          if (e.key === 'Escape') setSkinOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [skinOpen]);

      const chooseSkin = (id) => {
        setSkin(id);
        writeStored(SKIN_STORAGE_KEY, id);
      };

      const flashSkinMsg = (text) => {
        setSkinMsg(text);
        if (skinMsgTimer.current) clearTimeout(skinMsgTimer.current);
        skinMsgTimer.current = setTimeout(() => setSkinMsg(''), 3500);
      };

      const toggleDaily = (on) => {
        setDailyRandom(on);
        writeStored(BG_DAILY_KEY, on ? '1' : null);
      };

      const uploadOne = (file) => {
        compressImage(file)
          .then(async (data) => {
            // Persist first: an image that cannot be saved would vanish on reload.
            try {
              await manualBgSet(data);
            } catch {
              flashSkinMsg(t('skin.saveFailed'));
              return;
            }
            setManualBg(data);
            // A single explicit upload is a deliberate choice: it wins over the daily rotation.
            toggleDaily(false);
            setSkinMsg('');
          })
          .catch(() => flashSkinMsg(t('skin.uploadFailed')));
      };

      const importFolder = (fileList) => {
        const all = imageFiles(fileList);
        if (all.length === 0) {
          flashSkinMsg(t('skin.importNone'));
          return;
        }
        const capped = all.length > BG_POOL_CAP;
        const images = all.slice(0, BG_POOL_CAP);
        setSkinMsg('');
        setImportState({ done: 0, total: images.length });
        const collected = [];
        let failed = 0;
        bgDbClear()
          .catch(() => {})
          .then(() =>
            images.reduce(
              (chain, file, index) =>
                chain
                  .then(() => compressImage(file, 1600, 0.75))
                  .then((data) => {
                    collected.push(data);
                    return bgDbPut(String(index), data);
                  })
                  .catch(() => {
                    failed += 1;
                  })
                  .then(() => {
                    setImportState({ done: index + 1, total: images.length });
                  }),
              Promise.resolve(),
            ),
          )
          .then(() => {
            poolRef.current = collected;
            setPoolCount(collected.length);
            setImportState(null);
            if (collected.length > 0) {
              // A freshly imported library should show right away: default the
              // daily rotation on so today's pick renders immediately.
              setDailyRandom(true);
              writeStored(BG_DAILY_KEY, '1');
            }
            let note;
            if (collected.length === 0) note = t('skin.uploadFailed');
            else if (failed > 0) note = fmt(t('skin.importPartial'), { done: collected.length, failed });
            else note = fmt(t('skin.importDone'), { n: collected.length });
            if (capped) note += ` ${t('skin.poolCapped')}`;
            flashSkinMsg(note);
          });
      };

      const clearManualBg = () => {
        setManualBg(null);
        writeStored(BG_STORAGE_KEY, null);
        manualBgSet(null).catch(() => {});
      };

      const clearPool = () => {
        poolRef.current = [];
        setPoolCount(0);
        bgDbClear().catch(() => {});
      };

      React.useEffect(() => {
        if (!rootsOpen) return;
        const onKey = (e) => {
          if (e.key === 'Escape') setRootsOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [rootsOpen]);

      const openRoots = () => {
        setRootsOpen(true);
        setRootsMsg('');
        loadRoots().then((list) => setRoots(Array.isArray(list) ? list : []));
      };

      const addRootFromPicker = async () => {
        if (rootsBusy) return;
        setRootsBusy(true);
        setRootsMsg('');
        try {
          // One round trip: the Host opens the native picker, scans the chosen
          // folder and persists the resulting roots.
          const result = await addRootPick();
          setRoots(Array.isArray(result.roots) ? result.roots : []);
          if (result.picked === false) {
            setRootsMsg('');
          } else if (result.added === false) {
            setRootsMsg(t('projects.exists'));
            refresh();
          } else {
            setRootsMsg(fmt(t('projects.added'), { path: result.path }));
            refresh();
          }
        } catch (error) {
          setRootsMsg(fmt(t('projects.addFailed'), { message: String(error?.message ?? error) }));
        } finally {
          setRootsBusy(false);
        }
      };

      const removeRootByPath = async (path) => {
        if (rootsBusy) return;
        setRootsBusy(true);
        try {
          const result = await removeRoot(path);
          setRoots(Array.isArray(result.roots) ? result.roots : []);
          setRootsMsg(t('projects.removed'));
          refresh();
        } catch (error) {
          setRootsMsg(fmt(t('projects.addFailed'), { message: String(error?.message ?? error) }));
        } finally {
          setRootsBusy(false);
        }
      };

      // The quip always speaks about today, whichever range the dashboard shows.
      React.useEffect(() => {
        let alive = true;
        const apply = (data) => {
          if (alive) setTodayStats(scope === 'mine' ? data.mine : data.totals);
        };
        const cached = cacheRef.current.get('today');
        if (cached) apply(cached);
        else
          fetchJson('ganleme/stats?range=today')
            .then((data) => {
              cacheRef.current.set('today', data);
              apply(data);
            })
            .catch(() => {});
        return () => {
          alive = false;
        };
      }, [scope, tick]);

      // Quip pools exist in zh and en; any zh-* locale uses zh, all else en.
      const quipLang = () => (String(localeId?.() ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en');

      React.useEffect(() => {
        if (!todayStats) return;
        const lang = quipLang();
        const category = quipCategory(todayStats);
        const key = `${lang}:${category}`;
        const pools = QUIP_POOLS[lang] ?? QUIP_POOLS.zh;
        quipDeckRef.current[key] ??= makeQuipDeck(pools[category] ?? pools.praise);
        setQuip({ mood: category, text: quipDeckRef.current[key]() });
      }, [todayStats]);

      const rerollQuip = () => {
        setQuip((prev) => {
          if (!prev) return prev;
          const lang = quipLang();
          const key = `${lang}:${prev.mood}`;
          const pools = QUIP_POOLS[lang] ?? QUIP_POOLS.zh;
          quipDeckRef.current[key] ??= makeQuipDeck(pools[prev.mood] ?? pools.praise);
          return { mood: prev.mood, text: quipDeckRef.current[key]() };
        });
      };

      const flashUpdate = (state) => {
        setUpdateState(state);
        if (updateTimer.current) clearTimeout(updateTimer.current);
        if (state.phase === 'latest' || state.phase === 'error') {
          updateTimer.current = setTimeout(() => setUpdateState(null), 3000);
        }
      };

      // One click: check the registry, and when a newer version exists, ask the
      // Host to remove + reinstall through pluginManager; poll meta for the new
      // version and reload. The Host route answers before it uninstalls itself.
      const runUpdate = async () => {
        if (updateState && (updateState.phase === 'checking' || updateState.phase === 'updating')) return;
        setUpdateState({ phase: 'checking', message: t('update.checking') });
        let target;
        try {
          target = await fetchJson('ganleme/update');
          setUpdateLatest(target.updateAvailable ? target.latest : null);
        } catch (error) {
          flashUpdate({ phase: 'error', message: fmt(t('update.failed'), { message: String(error?.message ?? error) }) });
          return;
        }
        if (!target.updateAvailable) {
          flashUpdate({ phase: 'latest', message: t(target.localInstall ? 'update.local' : 'update.latest') });
          return;
        }
        setUpdateState({ phase: 'updating', message: fmt(t('update.updating'), { version: target.latest }) });
        const startedAt = Date.now();
        try {
          const res = await fetch('ganleme/update/install', { method: 'POST' });
          if (res.status !== 202) {
            const body = await res.json().catch(() => null);
            flashUpdate({ phase: 'error', message: fmt(t('update.failed'), { message: body?.message || `HTTP ${res.status}` }) });
            return;
          }
        } catch {
          // The request may be cut off while the plugin restarts; keep polling.
        }
        const poll = async () => {
          while (Date.now() - startedAt < 180_000) {
            await new Promise((resolve) => setTimeout(resolve, 2_000));
            try {
              const meta = await fetchJson('ganleme/meta');
              if (meta.version && meta.version !== target.current) {
                setUpdateState({ phase: 'done', message: fmt(t('update.done'), { version: meta.version }) });
                setTimeout(() => window.location.reload(), 1_200);
                return;
              }
              // The plugin came back on its old version with the reason recorded.
              const last = meta.lastUpdate;
              if (last && last.to === target.latest && last.at >= startedAt) {
                flashUpdate({ phase: 'error', message: fmt(t('update.failed'), { message: last.error }) });
                return;
              }
            } catch {
              // 404 while the bundle is being reinstalled.
            }
          }
          setUpdateState({ phase: 'error', message: t('update.timeout') });
        };
        void poll();
      };

      const refresh = () => {
        cacheRef.current.clear();
        setTick((x) => x + 1);
      };

      /**
       * Build one report. `entry` names the range; the saved format supplies
       * every other choice, so a second report reuses what was confirmed once.
       */
      const runReport = (entry, config) => {
        const key = entry.cacheKey ?? entry.range;
        const url = entry.url ?? `ganleme/stats?range=${entry.range}`;
        const options = {
          style: config.style,
          overrides: config.overrides,
          numbering: config.numbering,
          limit: config.limit,
        };
        const show = (data) => setReport({
          kind: entry.kind,
          data,
          text: buildReport(t, entry.kind, data, config.scope, config.format, options),
        });
        const cached = cacheRef.current.get(key);
        if (cached) {
          show(cached);
          return;
        }
        setReport({ kind: entry.kind });
        fetchJson(url)
          .then((data) => {
            cacheRef.current.set(key, data);
            show(data);
          })
          .catch((error) => setReport({ kind: entry.kind, error: String(error?.message ?? error) }));
      };

      const generateReport = (entry) => {
        // First use asks for the format before generating; later runs reuse it.
        const intent = reportIntent({ hasConfig: !!reportConfig, sheetOpen: !!draftConfig });
        if (intent.action === 'ask') {
          // Already configuring (perhaps a different range): keep the edits the
          // user has made and simply retarget the report that follows saving.
          pendingReportRef.current = entry;
          setDraftConfig((current) => current ?? { ...DEFAULT_REPORT_CONFIG });
          setReport(null);
          return;
        }
        // A settings sheet left open from an earlier visit is closed on generate.
        setDraftConfig(null);
        runReport(entry, reportConfig);
      };

      const generateCustomReport = () => {
        if (statsKey === null) return;
        generateReport({ kind: 'range', cacheKey: statsKey, url: statsUrl });
      };

      /** Confirm the format: persist it, then generate whatever was waiting. */
      const saveReportConfig = () => {
        const draft = draftConfig ?? reportConfig;
        if (!draft) return;
        const next = { ...DEFAULT_REPORT_CONFIG, ...draft };
        writeReportConfig(next);
        setReportConfig(next);
        setDraftConfig(null);
        const pending = pendingReportRef.current;
        pendingReportRef.current = null;
        if (pending) {
          runReport(pending, next);
          return;
        }
        // Re-render an open report in place with the new format.
        setReport((prev) => {
          if (!prev || !prev.data) return prev;
          const options = { style: next.style, overrides: next.overrides, numbering: next.numbering, limit: next.limit };
          return { ...prev, text: buildReport(t, prev.kind, prev.data, next.scope, next.format, options) };
        });
      };

      const cancelReportSettings = () => {
        // Abandoning the sheet drops the pending report and the edits: the next
        // generate asks again rather than generating in an unconfirmed format.
        pendingReportRef.current = null;
        setDraftConfig(null);
      };

      const openReportSettings = () => {
        // The gear edits the saved format; it never retargets a pending report.
        pendingReportRef.current = null;
        setDraftConfig((current) => current ?? { ...(reportConfig ?? DEFAULT_REPORT_CONFIG) });
      };

      /** Live preview for the settings sheet, built from a tiny sample. */
      const settingsPreview = draftConfig ? buildReport(t, 'daily', PREVIEW_DATA, draftConfig.scope, draftConfig.format, {
        style: draftConfig.style,
        overrides: draftConfig.overrides,
        numbering: draftConfig.numbering,
        limit: draftConfig.limit,
      }) : '';

      /** Open the polish sheet for the report currently on screen. */
      const openPolish = () => {
        const source = polishSource(report);
        if (!source) return;
        setPolish({
          source,
          draft: { level: 'items', tone: 'plain', note: '', system: '' },
          phase: 'idle',
          output: '',
          error: '',
        });
      };

      const closePolish = () => {
        polishAbortRef.current?.abort();
        polishAbortRef.current = null;
        setPolish(null);
      };

      const stopPolish = () => {
        polishAbortRef.current?.abort();
        polishAbortRef.current = null;
        setPolish((prev) => (prev ? { ...prev, phase: 'stopped' } : prev));
      };

      /**
       * Run one polish request: POST the report, read the event stream, and
       * fold deltas into the sheet. Aborting stops the read loop.
       */
      const startPolish = async () => {
        const current = polish;
        if (!current || current.phase === 'streaming') return;
        const controller = new AbortController();
        polishAbortRef.current = controller;
        setPolish({ ...current, phase: 'streaming', output: '', error: '' });
        const append = (chunk) => setPolish((prev) => (prev ? { ...prev, output: prev.output + chunk } : prev));
        const finish = (fields) => setPolish((prev) => (prev ? { ...prev, ...fields } : prev));
        try {
          const res = await fetch('ganleme/polish', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              text: current.source,
              level: current.draft.level,
              tone: current.draft.tone,
              note: current.draft.note,
              system: current.draft.system,

              language: localeId?.()?.startsWith('zh') ? 'zh' : 'en',
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            finish({ phase: 'idle', error: fmt(t('polish.failed'), { message: body?.message || `HTTP ${res.status}` }) });
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';
            for (const part of parts) {
              const line = part.split('\n').find((l) => l.startsWith('data: '));
              if (!line) continue;
              let frame;
              try {
                frame = JSON.parse(line.slice(6));
              } catch {
                continue;
              }
              if (frame.type === 'delta') append(frame.text);
              else if (frame.type === 'done') finish({ phase: 'ready' });
              else if (frame.type === 'rejected') {
                finish({ phase: 'ready', error: fmt(t('polish.numbersChanged'), { extra: (frame.extra ?? []).join(', ') }) });
              } else if (frame.type === 'aborted') finish({ phase: 'stopped' });
              else if (frame.type === 'error') {
                finish({ phase: 'idle', error: fmt(t('polish.failed'), { message: frame.message }) });
              }
            }
          }
          setPolish((prev) => (prev && prev.phase === 'streaming' ? { ...prev, phase: 'ready' } : prev));
        } catch (error) {
          if (controller.signal.aborted) setPolish((prev) => (prev ? { ...prev, phase: 'stopped' } : prev));
          else setPolish((prev) => (prev ? { ...prev, phase: 'idle', error: fmt(t('polish.failed'), { message: String(error?.message ?? error) }) } : prev));
        } finally {
          if (polishAbortRef.current === controller) polishAbortRef.current = null;
        }
      };

      /** Apply the (possibly hand-edited) rewrite to the report on screen. */
      const applyPolish = () => {
        if (!polish) return;
        const outcome = polishApplication(polish.source, polish.output);
        if (!outcome.applied) {
          // Never fail silently: the sheet stays open and says why.
          setPolish((prev) => (prev
            ? {
                ...prev,
                error: outcome.reason === 'numbers'
                  ? fmt(t('polish.numbersChanged'), { extra: outcome.extra.join(', ') })
                  : t('polish.emptyResult'),
              }
            : prev));
          return;
        }
        setReport((prev) => (prev ? { ...prev, text: outcome.text, original: prev.original ?? prev.text, polished: true } : prev));
        // Show the rewrite so the user immediately sees what landed.
        setShowOriginal(false);
        closePolish();
        flashPolishNotice(t('polish.applied'));
      };

      /** Transient confirmation for polish actions. */
      const flashPolishNotice = (text) => {
        setPolishNotice(text);
        if (polishNoticeTimer.current) clearTimeout(polishNoticeTimer.current);
        polishNoticeTimer.current = setTimeout(() => setPolishNotice(''), 3000);
      };

      const copyReport = () => {
        const text = report?.text;
        if (!text) return;
        copyText(text).then(() => {
          setCopied(true);
          if (copyTimer.current) clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1500);
        });
      };

      const toggleRepo = (key) => {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      };

      const totals = payload ? payload[scope === 'mine' ? 'mine' : 'totals'] ?? payload.totals : null;
      const allTotals = payload ? payload.totals : null;
      const rank = (repo) => (repo.ok ? (scope === 'mine' ? repo.mine.commits : repo.stats.commits) : -1);
      const repos = payload ? payload.repos.slice().sort((a, b) => rank(b) - rank(a)) : [];

      const dailyActive = dailyRandom && poolRef.current.length > 0;
      const activeBg = dailyActive ? poolRef.current[dailyIndex(poolRef.current.length)] : manualBg;
      const veil = veilOf(skin);
      return h(
        'div',
        {
          className: 'gl-page',
          'data-skin': skin,
          style: activeBg
            ? {
                backgroundImage: `linear-gradient(${veil}, ${veil}), url("${activeBg}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
              }
            : null,
        },
        h(
          'div',
          { className: 'gl-inner' },
          h(
            'div',
            { className: 'gl-head' },
            h(
              'div',
              null,
              h('h1', { className: 'gl-title' }, t('title')),
              quip
                ? h(
                    'p',
                    { className: 'gl-quip', title: t('quip.reroll'), onClick: rerollQuip },
                    `${QUIP_MOOD[quip.mood] ?? '💬'} ${quip.text}`,
                  )
                : h('p', { className: 'gl-sub' }, t('subtitle')),
            ),
            h(
              'div',
              { className: 'gl-actions' },
              updateState?.message ? h('span', { className: 'gl-updateStatus' }, updateState.message) : null,
              canUpdate
                ? h(
                    'button',
                    {
                      className: 'gl-iconBtn',
                      'data-alert': !!updateLatest,
                      'aria-label': updateLatest ? fmt(t('update.available'), { version: updateLatest }) : t('update.aria'),
                      title: updateLatest ? fmt(t('update.available'), { version: updateLatest }) : updateState?.message || t('update.aria'),
                      disabled: !!updateState && (updateState.phase === 'checking' || updateState.phase === 'updating'),
                      onClick: runUpdate,
                    },
                    h(UpdateIcon),
                  )
                : null,
              h('button', { className: 'gl-iconBtn', 'aria-label': t('refresh'), title: t('refresh'), onClick: refresh }, h(RefreshIcon)),
              h('button', { className: 'gl-iconBtn', 'aria-label': t('projects.label'), title: t('projects.label'), onClick: openRoots }, h(FolderPlusIcon)),
              h('button', { className: 'gl-iconBtn', 'aria-label': t('skin.label'), title: t('skin.label'), onClick: () => setSkinOpen(true) }, h(PaletteIcon)),
            ),
          ),
          h(
            'div',
            { className: 'gl-toolbar' },
            h(
              'div',
              { className: 'gl-actions' },
              h(
                'div',
                { className: 'gl-tabs', role: 'tablist' },
                RANGES.map((id) =>
                  h(
                    'button',
                    {
                      key: id,
                      className: 'gl-tab',
                      role: 'tab',
                      'aria-selected': range === id,
                      'data-active': range === id,
                      onClick: () => setRange(id),
                    },
                    t('range.' + id),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'gl-tabs', role: 'group', 'aria-label': t('scope.all'), style: { marginLeft: '8px' } },
                ['mine', 'all'].map((id) =>
                  h(
                    'button',
                    {
                      key: id,
                      className: 'gl-tab',
                      'aria-pressed': scope === id,
                      'data-active': scope === id,
                      onClick: () => setScope(id),
                    },
                    t('scope.' + id),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'gl-actions' },
              REPORT_KINDS.map((entry) => {
                // On the Yesterday tab, the daily report covers yesterday: the
                // usual morning task of writing up the previous day.
                const resolved = entry.kind === 'daily' && range === 'yesterday' ? { ...entry, range: 'yesterday', key: 'report.dailyYesterday' } : entry;
                return h(
                  'button',
                  { key: entry.kind, className: 'gl-btn', onClick: () => generateReport(resolved) },
                  t(resolved.key),
                );
              }),
              h(
                'button',
                {
                  className: 'gl-iconBtn',
                  'aria-label': t('report.settings'),
                  title: t('report.settings'),
                  onClick: openReportSettings,
                },
                h(GearIcon),
              ),
            ),
          ),
          range === 'custom'
            ? h(
                'div',
                { className: 'gl-dateRow' },
                h('span', { className: 'gl-dateLabel' }, t('custom.from')),
                h('input', {
                  type: 'date',
                  className: 'gl-date',
                  'aria-label': t('custom.from'),
                  value: customRange.from,
                  max: customRange.to && customRange.to <= todayStr ? customRange.to : todayStr,
                  onChange: (e) => setCustomRange((prev) => ({ ...prev, from: e.target.value })),
                }),
                h('span', { className: 'gl-dateSep' }, '—'),
                h('span', { className: 'gl-dateLabel' }, t('custom.to')),
                h('input', {
                  type: 'date',
                  className: 'gl-date',
                  'aria-label': t('custom.to'),
                  value: customRange.to,
                  min: customRange.from || undefined,
                  max: todayStr,
                  onChange: (e) => setCustomRange((prev) => ({ ...prev, to: e.target.value })),
                }),
                CUSTOM_PRESETS.map((id) =>
                  h(
                    'button',
                    { key: id, className: 'gl-chipBtn', onClick: () => setCustomRange(presetRange(id)) },
                    t('custom.' + id),
                  ),
                ),
                h(
                  'button',
                  { className: 'gl-btn', style: { marginLeft: 'auto' }, disabled: statsKey === null, onClick: generateCustomReport },
                  t('report.range'),
                ),
                customError ? h('span', { className: 'gl-dateError', role: 'alert', style: { flexBasis: '100%' } }, t(customError)) : null,
              )
            : null,
          phase === 'loading'
            ? h('div', { className: 'gl-status' }, h(LoadingGlyph, { size: 64, label: loadingText }))
            : null,
          phase === 'error'
            ? h(
                'div',
                { className: 'gl-status' },
                h('span', { className: 'gl-dot', 'data-error': true }),
                `${t('loadFailed')}: ${errorText}`,
                h('button', { className: 'gl-btn', onClick: refresh }, t('retry')),
              )
            : null,
          phase === 'ready' && totals
            ? h(
                'div',
                { className: 'gl-tiles' },
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.commits')), h('div', { className: 'gl-tileValue' }, fmtNum(totals.commits))),
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.additions')), h('div', { className: 'gl-tileValue gl-add' }, '+' + fmtNum(totals.insertions))),
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.deletions')), h('div', { className: 'gl-tileValue gl-del' }, '-' + fmtNum(totals.deletions))),
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.repos')), h('div', { className: 'gl-tileValue' }, fmtNum(totals.repos))),
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.files')), h('div', { className: 'gl-tileValue' }, fmtNum(totals.files))),
                h('div', { className: 'gl-tile' }, h('div', { className: 'gl-tileLabel' }, t('stat.authors')), h('div', { className: 'gl-tileValue' }, fmtNum(totals.authors.length))),
              )
            : null,
          phase === 'ready' && totals && totals.commits === 0
            ? h(
                'div',
                { className: 'gl-empty' },
                h(
                  'p',
                  { className: 'gl-emptyTitle' },
                  scope === 'mine' && allTotals && allTotals.commits > 0 ? t('empty.mine') : t('empty'),
                ),
                h(
                  'p',
                  { className: 'gl-emptyHint' },
                  scope === 'mine' && allTotals && allTotals.commits > 0 ? t('emptyHint.mine') : t('emptyHint'),
                ),
              )
            : null,
          phase === 'ready' && totals && totals.commits > 0
            ? h('div', { className: 'gl-section' }, t('section.repos'))
            : null,
          phase === 'ready' && totals && totals.commits > 0
            ? h(
                'div',
                { className: 'gl-cards' },
                repos.map((repo) =>
                  h(RepoCard, {
                    key: repo.key,
                    repo,
                    scope,
                    t,
                    expanded: expanded.has(repo.key),
                    onToggle: () => toggleRepo(repo.key),
                  }),
                ),
              )
            : null,
          report
            ? h(ReportModal, {
                report,
                t,
                copied,
                onCopy: copyReport,
                onSettings: openReportSettings,
                onPolish: openPolish,
                canPolish,
                showOriginal,
                onToggleOriginal: setShowOriginal,
                notice: polishNotice,
                onClose: () => setReport(null),
              })
            : null,
          polish
            ? h(PolishSheet, {
                draft: polish.draft,
                onDraft: (draft) => setPolish((prev) => (prev ? { ...prev, draft } : prev)),
                phase: polish.phase,
                output: polish.output,
                onOutput: (output) => setPolish((prev) => (prev ? { ...prev, output } : prev)),
                error: polish.error,
                onStart: startPolish,
                onStop: stopPolish,
                onApply: applyPolish,
                onCancel: closePolish,
                t,
              })
            : null,
          draftConfig
            ? h(ReportSettings, {
                draft: draftConfig,
                onDraft: setDraftConfig,
                preview: settingsPreview,
                firstRun: !reportConfig,
                onSave: saveReportConfig,
                onCancel: cancelReportSettings,
                t,
              })
            : null,
          skinOpen
            ? h(SkinModal, {
                skin,
                onSkin: chooseSkin,
                daily: dailyRandom,
                onDaily: toggleDaily,
                hasManual: !!manualBg,
                poolCount,
                importState,
                message: skinMsg,
                onUpload: uploadOne,
                onFolder: importFolder,
                onClearManual: clearManualBg,
                onClearPool: clearPool,
                onClose: () => setSkinOpen(false),
                t,
              })
            : null,
          rootsOpen
            ? h(ProjectsModal, {
                roots,
                busy: rootsBusy,
                message: rootsMsg,
                onAdd: addRootFromPicker,
                onRemove: removeRootByPath,
                onClose: () => setRootsOpen(false),
                t,
              })
            : null,
        ),
      );
    }

    // ------------------------------------------------------------------
    // Plugin entry
    // ------------------------------------------------------------------

    return {
      inject: ['slots', 'locale'],
      /** Pure helpers exposed for the repository's test suite; not a runtime API. */
      __test: {
        buildReport,
        windowLabel,
        presetRange,
        customRangeError,
        makeQuipDeck,
        quipCategory,
        QUIP_POOLS,
        QUIP_MOOD,
        SKINS,
        veilOf,
        readStored,
        writeStored,
        dailyIndex,
        imageFiles,
        fmtDate,
        createStatsCache,
        useDialogFocus,
        stripCommitPrefix,
        resolveReportSpec,
        REPORT_STYLES,
        REPORT_STYLE_ORDER,
        REPORT_TOGGLES,
        REPORT_CHOICES,
        NUMBERING,
        NUMBERING_ORDER,
        formatCommitLine,
        withStyle,
        reportIntent,
        ReportModal,
        ReportSettings,
        DashboardPage,
        readReportConfig,
        writeReportConfig,
        DEFAULT_REPORT_CONFIG,
        PREVIEW_DATA,
        COMMIT_TYPES,
        POLISH_LEVELS,
        POLISH_TONES,
        LoadingGlyph,
        useRotatingText,
        SkinModal,
        PolishSheet,
        polishSource,
        checkPolishNumbers,
        extractNumbers,
        polishApplication,
        loadManualBg,
        manualBgSet,
        manualBgGet,
        bgDbPut,
        bgDbGetAll,
        bgDbClear,
      },
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = PACKAGE;
          tag.dataset.pluginCss = `${PACKAGE}/styles`;
          tag.textContent = css;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'ganleme: styles');

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ganleme: dictionaries');
        const t = ctx.locale.bind(NS);

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 10, label: () => t('panel'), locale: NS },
            PanelIcon,
          ),
        );
        /** Browser → Host face: the native directory picker and project-source routes. */
        const face = {
          localeId: () => ctx.locale.getLocale?.().active ?? '',
          async addRootPick() {
            const res = await fetch('ganleme/roots/pick', { method: 'POST' });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
            return body;
          },
          async addRoot(path) {
            const res = await fetch('ganleme/roots/add', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ path }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
            return body;
          },
          async removeRoot(path) {
            const res = await fetch('ganleme/roots/remove', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ path }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
            return body;
          },
          async loadRoots() {
            try {
              return (await fetchJson('ganleme/roots')).roots ?? [];
            } catch {
              return [];
            }
          },
        };

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => face }, DashboardPage),
        );
      },
    };
  },
});
