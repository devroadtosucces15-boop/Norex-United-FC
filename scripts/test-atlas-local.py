#!/usr/bin/env python3
"""Read-only smoke and security checks for the local NOREX explorer."""
import json
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen

BASE="http://127.0.0.1:8765"
class ExplorerTests(unittest.TestCase):
    def request(self,path):
        try:
            with urlopen(BASE+path,timeout=8) as r:return r.status,r.read(),dict(r.headers)
        except HTTPError as e:return e.code,e.read(),dict(e.headers)
    def test_explorer_loads(self):
        start=time.perf_counter();status,body,_=self.request("/explorer.html")
        self.assertEqual(status,200);self.assertIn(b"explorer-navigation.js",body)
        self.assertLess(time.perf_counter()-start,8)
    def test_private_manifest_not_exposed(self):
        # The local server intentionally serves the private explorer index, but
        # the separate raw manifest must not expose paths to unauthenticated clients.
        status,_,_=self.request("/private-sources.json")
        self.assertNotEqual(status,200,"Private manifest publicly served on loopback")
    def test_traversal_rejected(self):
        for payload in ("../../.ssh/id_rsa","norex_fc27/../../.ssh/id_rsa","/etc/passwd",""):
            with self.subTest(payload=payload):
                status,_,_=self.request("/__local_preview?id="+quote(payload,safe=""))
                self.assertEqual(status,404)
    def test_preview_content_type(self):
        data=json.loads((Path.home()/".local/share/norex-atlas/private-sources.json").read_text())
        candidates=[n for n in data["nodes"] if n["path"].lower().endswith(".md") and n.get("bytes",9999999)<1000000]
        if not candidates:self.skipTest("No eligible local Markdown file")
        status,_,headers=self.request("/__local_preview?id="+quote(candidates[0]["path"],safe=""))
        self.assertEqual(status,200);self.assertTrue(headers["Content-Type"].startswith("text/plain"))
        self.assertEqual(headers.get("X-Content-Type-Options"),"nosniff")
if __name__=="__main__":unittest.main(verbosity=2)
