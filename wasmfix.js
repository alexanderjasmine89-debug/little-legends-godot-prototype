// The Godot engine binary (index.wasm, ~44 MB) exceeds the per-file
// upload limit of the hosting repo, so it is published in three parts.
// This shim intercepts the engine's fetch of "index.wasm" and assembles
// the parts in the browser before handing them over as one response.
(function () {
	var PARTS = ["index.wasm.part0", "index.wasm.part1", "index.wasm.part2"];
	var origFetch = window.fetch.bind(window);
	var assembled = null;

	function getWasm() {
		if (assembled) {
			return assembled;
		}
		assembled = Promise.all(PARTS.map(function (p) {
			return origFetch(p).then(function (r) {
				if (!r.ok) {
					throw new Error("wasm part failed: " + p);
				}
				return r.arrayBuffer();
			});
		})).then(function (bufs) {
			var total = 0;
			for (var i = 0; i < bufs.length; i++) {
				total += bufs[i].byteLength;
			}
			var out = new Uint8Array(total);
			var off = 0;
			for (var j = 0; j < bufs.length; j++) {
				out.set(new Uint8Array(bufs[j]), off);
				off += bufs[j].byteLength;
			}
			return out.buffer;
		});
		return assembled;
	}

	window.fetch = function (input, init) {
		var url = "";
		if (typeof input === "string") {
			url = input;
		} else if (input && input.url) {
			url = input.url;
		}
		if (/index\.wasm($|\?)/.test(url)) {
			return getWasm().then(function (buf) {
				return new Response(buf, {
					status: 200,
					headers: { "Content-Type": "application/wasm" },
				});
			});
		}
		return origFetch(input, init);
	};
})();
