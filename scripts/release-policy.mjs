export const FIRST_LICENSED_RELEASE = "0.1.2";

export function requiresBundledLicense(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`非法 stable Release 版本：${version}`);
  const current = version.split(".").map(BigInt);
  const minimum = FIRST_LICENSED_RELEASE.split(".").map(BigInt);
  for (let index = 0; index < current.length; index++) {
    if (current[index] > minimum[index]) return true;
    if (current[index] < minimum[index]) return false;
  }
  return true;
}
