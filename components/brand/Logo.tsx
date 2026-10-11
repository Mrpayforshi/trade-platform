import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { variant?: "full" | "mark" };

const SHIP =
  "M222 65C285 150 235 262 90 333L90 341C235 412 285 524 222 609Q450 493 684 337Q450 181 222 65ZM268 337Q385 337 315 135Q385 337 684 337Q385 337 315 539Q385 337 268 337ZM298 337Q392 337 362 222Q400 337 640 337Q400 337 362 452Q392 337 298 337Z";

/**
 * Nexum logo. Ring and wordmark use currentColor, so set the text colour to switch light/dark
 * (e.g. text-ink on paper, text-white on dark). variant="mark" is the spaceship on its own.
 */
export function Logo({ variant = "full", ...props }: Props) {
  if (variant === "mark") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="88 63 600 548" role="img" aria-label="Nexum" {...props}>
        <path d={SHIP} fill="#22A45D" fillRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="80 215 1620 340" role="img" aria-label="Nexum" {...props}>
      <circle cx="138" cy="493" r="35.5" fill="none" stroke="currentColor" strokeWidth="23" />
      <path d="M190 443C250 385 350 330 478 316" fill="none" stroke="#22A45D" strokeWidth="19" strokeLinecap="round" strokeDasharray="0.1 41.5" />
      <path d="M633 323C690 340 740 365 775 396" fill="none" stroke="#F99D38" strokeWidth="19" strokeLinecap="round" strokeDasharray="0.1 40" />
      <circle cx="823" cy="442" r="31" fill="none" stroke="#F99D38" strokeWidth="22" />
      <g transform="rotate(6 565 314) translate(490 246) scale(.25) translate(-88 -63)">
        <path d={SHIP} fill="#22A45D" fillRule="evenodd" />
      </g>
      <path d="M1062.5 510H1023L956.9 409.9V510H917.3V347.7H956.9L1023 448.3V347.7H1062.5Z" fill="currentColor" />
      <path d="M1199.1 455H1109.6Q1110.6 467 1117.4 473.4Q1124.2 479.7 1134.2 479.7Q1149 479.7 1154.7 467.2H1196.8Q1193.6 479.9 1185.1 490.1Q1176.7 500.3 1164 506.1Q1151.3 511.8 1135.5 511.8Q1116.6 511.8 1101.8 503.8Q1087 495.7 1078.7 480.6Q1070.3 465.6 1070.3 445.5Q1070.3 425.4 1078.5 410.4Q1086.8 395.3 1101.6 387.2Q1116.4 379.1 1135.5 379.1Q1154.3 379.1 1168.8 387Q1183.4 394.9 1191.6 409.4Q1199.8 424 1199.8 443.4Q1199.8 449 1199.1 455ZM1159.4 433Q1159.4 422.8 1152.4 416.8Q1145.5 410.8 1135.1 410.8Q1125.1 410.8 1118.3 416.6Q1111.5 422.4 1109.9 433Z" fill="#F99D38" />
      <path d="M1283.9 510 1259.2 474.2 1238.4 510H1195.6L1238.1 444.1L1194.4 381H1238.8L1263.6 416.6L1284.4 381H1327.2L1283.9 446L1328.3 510ZM1458 381V510H1418.4V492.4Q1412.4 501 1402.1 506.2Q1391.8 511.4 1379.4 511.4Q1364.6 511.4 1353.2 504.8Q1341.9 498.2 1335.7 485.7Q1329.4 473.2 1329.4 456.4V381H1368.7V451Q1368.7 464 1375.4 471.2Q1382.1 478.3 1393.5 478.3Q1405 478.3 1411.7 471.2Q1418.4 464 1418.4 451V381ZM1690.5 434.6V510H1651.2V439.9Q1651.2 427.5 1644.6 420.6Q1638 413.8 1626.5 413.8Q1614.9 413.8 1608.3 420.6Q1601.7 427.5 1601.7 439.9V510H1562.4V439.9Q1562.4 427.5 1555.8 420.6Q1549.2 413.8 1537.7 413.8Q1526.1 413.8 1519.5 420.6Q1512.9 427.5 1512.9 439.9V510H1473.4V381H1512.9V397.2Q1519 389.1 1528.7 384.3Q1538.4 379.6 1550.6 379.6Q1565.2 379.6 1576.6 385.8Q1588.1 392.1 1594.6 403.6Q1601.3 393 1612.8 386.3Q1624.4 379.6 1638 379.6Q1662.1 379.6 1676.3 394.2Q1690.5 408.7 1690.5 434.6Z" fill="currentColor" />
    </svg>
  );
}
