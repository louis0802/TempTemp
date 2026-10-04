import { BlockList, isIP } from "node:net";

/** Direct transport security policy, independent of signal/link-resolution modules. */
const denied = new BlockList();
for (const [ip, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  denied.addSubnet(ip, prefix, "ipv4");
for (const [ip, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  denied.addSubnet(ip, prefix, "ipv6");
// Azure platform virtual IP is publicly numbered but is not a public web destination.
denied.addAddress("168.63.129.16", "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
export function publicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4
    ? !denied.check(address, "ipv4")
    : family === 6 &&
        globalV6.check(address, "ipv6") &&
        !denied.check(address, "ipv6");
}
class Blocked extends Error {}
export function validateTarget(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Blocked("unsupported_scheme");
  if (url.username || url.password) throw new Blocked("embedded_credentials");
  if (url.port) throw new Blocked("non_default_port");
  const host = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    host === "localhost" ||
    /\.(?:localhost|local|internal|test|invalid)$/.test(host) ||
    (!host.includes(".") && !isIP(host))
  )
    throw new Blocked("non_public_hostname");
  if (isIP(host) && !publicAddress(host))
    throw new Blocked("non_public_address");
  return url;
}
