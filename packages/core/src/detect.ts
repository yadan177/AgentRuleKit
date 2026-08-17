import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type {
  DetectedStack,
  DetectionEvidence,
  DetectionResult,
  StackId,
} from "./types.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function packageJsonEvidence(root: string): Promise<{
  javascript?: DetectionEvidence;
  typescript?: DetectionEvidence;
}> {
  const packagePath = path.join(root, "package.json");
  if (!(await exists(packagePath))) {
    return {};
  }

  const result: {
    javascript?: DetectionEvidence;
    typescript?: DetectionEvidence;
  } = {
    javascript: {
      path: "package.json",
      reason: "存在 Node.js package manifest",
    },
  };

  try {
    const parsed = JSON.parse(await readFile(packagePath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...parsed.dependencies,
      ...parsed.devDependencies,
    };
    if (dependencies.typescript || (await exists(path.join(root, "tsconfig.json")))) {
      result.typescript = {
        path: dependencies.typescript ? "package.json" : "tsconfig.json",
        reason: dependencies.typescript
          ? "项目依赖中声明了 TypeScript"
          : "存在 TypeScript 配置文件",
      };
    }
  } catch {
    // A malformed package.json is still evidence of a JavaScript project.
  }

  return result;
}

export async function detectProject(root: string): Promise<DetectionResult> {
  const resolvedRoot = path.resolve(root);
  const evidence = new Map<StackId, DetectionEvidence[]>();

  const add = (id: StackId, item: DetectionEvidence): void => {
    evidence.set(id, [...(evidence.get(id) ?? []), item]);
  };

  const nodeEvidence = await packageJsonEvidence(resolvedRoot);
  if (nodeEvidence.javascript) add("javascript", nodeEvidence.javascript);
  if (nodeEvidence.typescript) add("typescript", nodeEvidence.typescript);

  const fileMarkers: Array<[StackId, string, string]> = [
    ["python", "pyproject.toml", "存在 Python 项目元数据"],
    ["python", "requirements.txt", "存在 Python 依赖文件"],
    ["go", "go.mod", "存在 Go module manifest"],
    ["java", "pom.xml", "存在 Maven 项目 manifest"],
    ["java", "build.gradle", "存在 Gradle 构建文件"],
    ["java", "build.gradle.kts", "存在 Gradle Kotlin 构建文件"],
    [
      "unity",
      path.join("ProjectSettings", "ProjectVersion.txt"),
      "存在 Unity 项目版本文件",
    ],
  ];

  for (const [id, relativePath, reason] of fileMarkers) {
    if (await exists(path.join(resolvedRoot, relativePath))) {
      add(id, { path: relativePath, reason });
    }
  }

  if (evidence.size === 0) {
    const entries = await readdir(resolvedRoot, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name.endsWith(".py"))) {
      add("python", {
        path: "*.py",
        reason: "项目根目录存在 Python 源文件",
      });
    }
  }

  const stacks: DetectedStack[] = [...evidence.entries()]
    .map(([id, items]): DetectedStack => ({
      id,
      confidence: items.some((item) => item.path !== "*.py") ? "high" : "medium",
      evidence: items,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return { root: resolvedRoot, stacks };
}
