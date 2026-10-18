"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu";
import { useOptionalReportTheme } from "./theme-scope";
import styles from "./report.module.css";

interface ReportShareMenuProps {
  shareId?: string;
  copyStatus: "idle" | "copying" | "copied" | "error";
  canCopy: boolean;
  onCopy: () => void;
}

export function ReportShareMenu({
  shareId,
  copyStatus,
  canCopy,
  onCopy,
}: ReportShareMenuProps) {
  const theme = useOptionalReportTheme();
  const copied = copyStatus === "copied";

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" />}>
        {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        {copied ? "Link copied" : "Share"}
      </MenuTrigger>
      <MenuPopup
        align="end"
        portalProps={{ container: theme?.scopeElement }}
        className={styles.shareMenu}
      >
        {shareId && (
          <MenuLinkItem
            render={<Link href={`/share/${encodeURIComponent(shareId)}`} />}
          >
            <ExternalLink aria-hidden="true" />
            Share link
          </MenuLinkItem>
        )}
        <MenuItem
          disabled={!canCopy || copyStatus === "copying"}
          onClick={onCopy}
        >
          <Copy aria-hidden="true" />
          {copyStatus === "copying" ? "Copying…" : "Copy report link"}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
