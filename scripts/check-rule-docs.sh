#!/usr/bin/env bash
set -uo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if (($# > 0)); then
  roots=("$@")
else
  roots=(
    "$repo_root/rulepacks/javascript"
    "$repo_root/rulepacks/typescript"
    "$repo_root/rulepacks/python"
    "$repo_root/rulepacks/go"
    "$repo_root/rulepacks/java"
    "$repo_root/rulepacks/unity"
    "$repo_root/rulepacks/pico"
    "$repo_root/rulepacks/rule-authoring"
    "$repo_root/rulepacks/project-docs"
  )
fi

ruby - "$repo_root" "${roots[@]}" <<'RUBY'
require 'uri'

repo_root = ARGV.shift
files = ARGV.flat_map do |root|
  File.file?(root) ? [root] : Dir.glob(File.join(root, '**', '*.md'), File::FNM_DOTMATCH)
end.uniq.sort
findings = []
counts = Hash.new(0)
anchor_cache = {}

def markdown_anchors(file)
  anchors = []
  occurrences = Hash.new(0)
  in_fence = false
  File.foreach(file, encoding: 'UTF-8') do |line|
    if line.match?(/^\s*(?:```|~~~)/)
      in_fence = !in_fence
      next
    end
    next if in_fence
    match = line.match(/^\#{1,6}\s+(.+?)\s*\#*\s*$/)
    next unless match
    text = match[1].gsub(/`([^`]*)`/, '\\1').gsub(/<[^>]+>/, '')
    base = text.downcase.gsub(/[^\p{L}\p{N}\s_-]/u, '').strip.gsub(/\s+/, '-')
    next if base.empty?
    suffix = occurrences[base]
    anchors << (suffix.zero? ? base : "#{base}-#{suffix}")
    occurrences[base] += 1
  end
  anchors
end

entry_targets = {
  '.agent-rules/javascript/15-AI通用入口规则.md' => 'rulepacks/javascript/15-AI通用入口规则.md',
  '.agent-rules/javascript/00-文档总览.md' => 'rulepacks/javascript/00-文档总览.md',
  '.agent-rules/typescript/09-AI通用入口规则.md' => 'rulepacks/typescript/09-AI通用入口规则.md',
  '.agent-rules/typescript/00-文档总览.md' => 'rulepacks/typescript/00-文档总览.md',
  '.agent-rules/python/14-AI通用入口规则.md' => 'rulepacks/python/14-AI通用入口规则.md',
  '.agent-rules/python/00-文档总览.md' => 'rulepacks/python/00-文档总览.md',
  '.agent-rules/go/13-AI通用入口规则.md' => 'rulepacks/go/13-AI通用入口规则.md',
  '.agent-rules/go/00-文档总览.md' => 'rulepacks/go/00-文档总览.md',
  '.agent-rules/java/14-AI通用入口规则.md' => 'rulepacks/java/14-AI通用入口规则.md',
  '.agent-rules/java/00-文档总览.md' => 'rulepacks/java/00-文档总览.md',
  '.agent-rules/unity/15-AI通用入口规则.md' => 'rulepacks/unity/15-AI通用入口规则.md',
  '.agent-rules/unity/00-文档总览.md' => 'rulepacks/unity/00-文档总览.md',
  '.agent-rules/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md' => 'rulepacks/project-docs/js-ts/其他规则/04-JS+TSAI技术文档任务入口.md',
  '.agent-rules/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md' => 'rulepacks/project-docs/js-ts/其他规则/01-技术文档组织与维护规范.md',
  '.agent-rules/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md' => 'rulepacks/project-docs/python/其他规则/04-PythonAI技术文档任务入口.md',
  '.agent-rules/project-docs/python/其他规则/01-技术文档组织与维护规范.md' => 'rulepacks/project-docs/python/其他规则/01-技术文档组织与维护规范.md',
  '.agent-rules/project-docs/go/其他规则/04-GoAI技术文档任务入口.md' => 'rulepacks/project-docs/go/其他规则/04-GoAI技术文档任务入口.md',
  '.agent-rules/project-docs/go/其他规则/01-技术文档组织与维护规范.md' => 'rulepacks/project-docs/go/其他规则/01-技术文档组织与维护规范.md',
  '.agent-rules/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md' => 'rulepacks/project-docs/java/其他规则/04-JavaAI技术文档任务入口.md',
  '.agent-rules/project-docs/java/其他规则/01-技术文档组织与维护规范.md' => 'rulepacks/project-docs/java/其他规则/01-技术文档组织与维护规范.md',
  '.agent-rules/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md' => 'rulepacks/project-docs/unity/其他规则/04-UnityAI技术文档任务入口.md',
  '.agent-rules/project-docs/unity/其他规则/01-技术文档组织与维护规范.md' => 'rulepacks/project-docs/unity/其他规则/01-技术文档组织与维护规范.md'
}

files.each do |file|
  lines = File.readlines(file, encoding: 'UTF-8')
  relative = file.delete_prefix(repo_root + '/')
  adapter = relative.include?('/适配器模板/')
  first = lines.first.to_s.chomp
  unless adapter || first.match?(/^# \d{2} - /)
    findings << "H1 #{relative}:1 #{first}"
    counts[:h1] += 1
  end

  unless adapter
    first_h2 = lines.index { |line| line.start_with?('## ') }
    if first_h2
      header = lines[0...first_h2]
      separators = header.each_index.select { |index| header[index].strip == '---' }
      scopes = header.each_index.select { |index| header[index].start_with?('> ') }
      if separators.length != 1
        findings << "HEADER_SEPARATOR #{relative}: expected 1 before first H2, found #{separators.length}"
        counts[:header_separator] += 1
      elsif scopes.any? && separators.first < scopes.last
        findings << "HEADER_ORDER #{relative}:#{separators.first + 1} separator must follow scope list"
        counts[:header_order] += 1
      end
      scopes.each do |index|
        next if header[index].start_with?('> - ')
        findings << "SCOPE_FORMAT #{relative}:#{index + 1} use a blockquote list item"
        counts[:scope_format] += 1
      end
    end
  end

  in_fence = false
  visible = []
  h2_numbers = []
  required_lines = Hash.new { |hash, key| hash[key] = [] }
  lines.each_with_index do |line, index|
    number = index + 1
    if line.match?(/^\s*(?:```|~~~)/)
      in_fence = !in_fence
      next
    end
    next if in_fence

    visible << [number, line]
    if !adapter && line.start_with?('## ') && !line.match?(/^## \d+\. /)
      findings << "H2 #{relative}:#{number} #{line.chomp}"
      counts[:h2] += 1
    end
    if !adapter && (h2_match = line.match(/^## (\d+)\. /))
      h2_numbers << [h2_match[1].to_i, number]
    end

    normalized = line.strip.gsub(/\s+/, ' ')
    required_lines[normalized] << number if normalized.include?('🔴')

    scan_line = line.gsub(/`[^`]*`/, '')
    if scan_line.match?(/<br\s*\/?\s*>/i)
      findings << "RAW_BR #{relative}:#{number} use Markdown structure instead of HTML br"
      counts[:raw_br] += 1
    end
    scan_line.scan(/\[[^\]]*\]\(([^)]+)\)/).flatten.each do |target|
      clean = target.strip
      clean = clean[1...-1] if clean.start_with?('<') && clean.end_with?('>')
      next if clean.match?(/^(?:https?:|mailto:)/)
      path_with_query, fragment = clean.split('#', 2)
      path = path_with_query.sub(/\?.*/, '')
      begin
        decoded = URI::DEFAULT_PARSER.unescape(path)
        decoded_fragment = fragment && URI::DEFAULT_PARSER.unescape(fragment)
      rescue URI::Error
        findings << "LINK_ENCODING #{relative}:#{number} #{target}"
        counts[:link_encoding] += 1
        next
      end
      resolved = decoded.empty? ? file : File.expand_path(decoded, File.dirname(file))
      unless File.exist?(resolved)
        findings << "LINK #{relative}:#{number} #{target}"
        counts[:link] += 1
        next
      end
      if decoded_fragment && File.file?(resolved) && File.extname(resolved).downcase == '.md'
        anchors = anchor_cache[resolved] ||= markdown_anchors(resolved)
        unless anchors.include?(decoded_fragment)
          findings << "ANCHOR #{relative}:#{number} #{target}"
          counts[:anchor] += 1
        end
      end
    end

    if line.include?('见 。') || line.include?('见 ）') || line.include?('参见 ）') || line.include?('（待写）')
      findings << "INCOMPLETE #{relative}:#{number} #{line.strip}"
      counts[:incomplete] += 1
    end
  end

  if in_fence
    findings << "FENCE #{relative}: unclosed fenced code block"
    counts[:fence] += 1
  end

  unless adapter
    expected_h2 = (1..h2_numbers.length).to_a
    actual_h2 = h2_numbers.map(&:first)
    if actual_h2 != expected_h2
      findings << "H2_SEQUENCE #{relative}: #{actual_h2.join(',')}"
      counts[:h2_sequence] += 1
    end
  end

  visible.each_with_index do |(number, line), index|
    next unless line.match?(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/)
    seen_h2 = visible[0...index].any? { |(_, previous)| previous.start_with?('## ') }
    next unless seen_h2
    cursor = index + 1
    cursor += 1 while cursor < visible.length && visible[cursor][1].strip.empty?
    if cursor < visible.length && visible[cursor][1].start_with?('## ')
      findings << "SEPARATOR #{relative}:#{number} before #{visible[cursor][1].strip}"
      counts[:separator] += 1
    end
  end

  required_lines.each do |text, locations|
    next if text.length < 20 || locations.length < 2
    findings << "DUPLICATE #{relative}:#{locations.join(',')} #{text}"
    counts[:duplicate] += 1
  end

  content = lines.join
  entry_targets.each do |installed, source|
    next unless content.include?(installed)
    unless File.exist?(File.join(repo_root, source))
      findings << "ENTRY #{relative} #{installed} -> missing source #{source}"
      counts[:entry] += 1
    end
  end

  lines.each_with_index do |line, index|
    next unless line.include?('git reset --hard')
    from = [index - 3, 0].max
    to = [index + 3, lines.length - 1].min
    context = lines[from..to].join
    next if context.match?(/明确授权|必须获得.*授权|破坏性|丢弃.*改动|慎用.*丢/)
    findings << "DESTRUCTIVE #{relative}:#{index + 1} git reset --hard requires explicit authorization and data-loss context"
    counts[:destructive] += 1
  end
end

conflicts = {
  /发布版本必须禁用 CGO/ => 'CGO absolute rule',
  /Prettier.*唯一选择/ => 'formatter absolute rule',
  /一个文件一个 public 类/ => 'Unity public class absolute rule',
  /必须包含负责人和日期/ => 'TODO owner/date absolute rule',
  /React\/Vue 检测不到变化/ => 'React and Vue reactivity conflation',
  /AI 默认推荐\s*cross-env/i => 'cross-env default recommendation',
  /每次提交前扫描已知漏洞/ => 'unconditional govulncheck gate',
  /CI .*必须.*govulncheck/i => 'unconditional govulncheck CI gate',
  /精确版本.*绝不.*锁死在 lockfile/ => 'exact dependency version prohibition',
  /^### .*使用 `go\.uber\.org\/atomic`/ => 'third-party atomic default',
  /React 服务端态/ => 'React-specific state in generic data rules',
  /fetch 默认不带 cookie/ => 'incorrect Fetch credentials default',
  /context\.WithTimeout.*正则/ => 'non-cancellable regexp timeout claim',
  /panic 不会.*整个进程/ => 'incorrect Go panic process behavior',
  /^\*\*POST 必须带 CSRF token/ => 'unconditional CSRF requirement',
  /legacy 装饰器.*已废弃/ => 'legacy decorators treated as universally deprecated',
  /experimentalDecorators: false.*用 TC39/ => 'unconditional standard decorators configuration',
  /编译器优化.*无拷贝/ => 'unconditional byte-to-string zero-copy claim',
  /发布构建的五级本地日志默认均不显示/ => 'server production logs disabled with browser logs',
  /生产代码中绝不 panic/ => 'absolute production panic prohibition',
  /不可恢复情况.*nil pointer/ => 'nil pointer recommended as an active panic case',
  /第一个参数永远是.*context/ => 'context required for every function',
  /只有 .*main.*init.*测试函数可以新建 context/ => 'root context creation restricted to fixed functions',
  /私有顶层.*加 `_` 前缀——/ => 'non-idiomatic Go private global prefix',
  /zod 校验.*首选/ => 'zod selected without project evidence',
  /ESLint.*已强制/ => 'ESLint rule claimed as universally enforced',
  /['"]@typescript-eslint\/no-unsafe-\*['"]/ => 'invalid ESLint wildcard rule name',
  /AndroidJavaClass\s*\.FromType/ => 'nonexistent AndroidJavaClass.FromType API',
  /net\/http 不解析 GET body/ => 'incorrect absolute claim about Go GET request bodies',
  /time\.Time.*omitempty.*会省略/ => 'incorrect time.Time omitempty claim',
  /grpc\.WithInsecure\(\)/ => 'deprecated insecure gRPC transport example',
  /gofmt -s -w \./ => 'invalid repository-wide gofmt command',
  /Header\(\)\.Set\(["']X-XSS-Protection["']/ => 'deprecated X-XSS-Protection header baseline',
  /govet.*包括.*shadow/i => 'incorrect claim that default govet includes shadow',
  /Prettier.*格式化 Go/i => 'Prettier presented as a Go formatter',
  /\*\*不要复数\*\*——/ => 'Go package plural names universally prohibited',
  /不要下划线、不要驼峰、不要复数/ => 'Go package plural names universally prohibited',
  /\*\*配置 ESLint 强制\*\*/ => 'TypeScript ESLint rules forced without project evidence',
  /\*\*ESLint 强制\*\*/ => 'TypeScript ESLint rules forced without project evidence',
  /用 \*\*\[testcontainers-go\]/ => 'testcontainers selected as the default integration stack',
  /快速原型 \/ 小项目 → GORM/ => 'database library selected from project size alone',
  /GORM \/ sqlx 的 Scan 对列顺序敏感/ => 'incorrect ORM and sqlx column-order claim',
  /永远用 TextMeshPro/ => 'TextMeshPro forced for every UGUI project',
  /所有 UI 组件引用都用 `\[SerializeField\] private`/ => 'Unity UI reference ownership conflated with serialization',
  /Release.*所有 .*ProjectLog\.Exception.*编译期移除/ => 'Unity release exceptions unconditionally stripped',
  /快速原型 \/ 中小项目.*首选/ => 'CSS tool selected from project size alone',
  /内部微服务间调用 \| gRPC/ => 'gRPC selected for every internal service call',
  /不要返回 Go 的 nil 切片为 `null`/ => 'JSON empty-list representation forced across API contracts',
  /^### .*闭包实现（不推荐）/ => 'functional option closures treated as an anti-pattern',
  /测试.*多种输入.*必须用此模式/ => 'table-driven tests forced for every multi-case test',
  /testify\/assert.*✅ 推荐/ => 'testify selected without project evidence',
  /本条与\s+是同一规则/ => 'missing cross-reference target',
  /Go 的语言特性让 4\/5 条 SOLID 被内置满足/ => 'SOLID treated as automatically guaranteed by Go',
  /LSP 自动满足/ => 'LSP treated as automatically guaranteed by Go',
  /接口方法数 .*≤ 3/ => 'fixed Go interface method-count threshold',
  /Go 编译器会警告未使用方法/ => 'incorrect unused-method compiler claim',
  /包大小 < 1000 行/ => 'fixed Go package size threshold',
  /包名是小写单词、无下划线、无复数/ => 'Go package plural names universally prohibited',
  /import 分三组（标准库 \/ 第三方 \/ 内部）/ => 'fixed import groups conflicting with repository tooling',
  /^- Max Size: 2048\s*$/ => 'fixed Unity texture import size',
  /LOD Bias:\s*1\.5.*1\.0/ => 'fixed Unity LOD bias by broad platform label',
  /第一个场景是 Splash/ => 'Unity splash scene forced as the first scene',
  /UNITY_ANDROID;UNITY_EDITOR/ => 'Unity built-in symbols added as custom scripting defines',
  /至少 3 个 Quality Level/ => 'fixed Unity quality-level count',
  /整个应用共享一个实例/ => 'single database pool forced for every topology',
  /一个 service 方法 = 一个事务/ => 'transaction boundary forced from method boundary',
  /每次 1000 行/ => 'fixed database migration batch size',
  /主键查询.*< 5ms/ => 'fixed database latency threshold',
  /otelsql\.Open/ => 'observability dependency introduced as a default',
  /纯查询操作使用只读事务/ => 'read-only transaction forced for every query',
  /绝不拼字符串构造 SQL/ => 'SQL value binding conflated with validated identifiers',
  /inuse_space.*内存泄漏/ => 'heap growth treated as proof of a memory leak',
  /alloc_space.*持续增长.*分配过多/ => 'cumulative allocation growth treated as an anomaly',
  /比直接调用慢 \*\*10-100x\*\*/ => 'fixed reflection slowdown claim',
  /热路径上.*json-iterator.*easyjson/ => 'third-party JSON library selected from a generic hot-path label',
  /allocs\/op 比 ns\/op 更值得关注/ => 'allocation count universally prioritized over latency',
  /性能差异 100x\+/ => 'fixed string-concatenation performance claim'
}
files.each do |file|
  relative = file.delete_prefix(repo_root + '/')
  File.foreach(file, encoding: 'UTF-8').with_index(1) do |line, number|
    if relative.match?(%r{\Arulepacks/(?:javascript|typescript)/.*安全规则\.md\z}) &&
       line.match?(/本文件适用于 Java 项目安全红线/)
      findings << "CONFLICT #{relative}:#{number} Java scope copied into JavaScript/TypeScript security rules"
      counts[:conflict] += 1
    end
    conflicts.each do |pattern, label|
      next unless line.match?(pattern)
      findings << "CONFLICT #{relative}:#{number} #{label}"
      counts[:conflict] += 1
    end
  end
end

puts "Automated structure, link, and known-conflict checks: #{files.length} Markdown files"
puts counts.keys.sort.map { |key| "#{key}=#{counts[key]}" }.join(' ')
puts findings
puts "Note: automated checks do not validate general technical accuracy; manual review is still required."
exit(findings.empty? ? 0 : 1)
RUBY
