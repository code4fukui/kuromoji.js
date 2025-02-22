/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//var path = require("path");
//var async = require("async");
import { DynamicDictionaries } from "../dict/DynamicDictionaries.js";

/**
 * DictionaryLoader base constructor
 * @param {string} dic_path Dictionary path
 * @constructor
 */
export function DictionaryLoader(dic_path) {
    this.dic = new DynamicDictionaries();
    this.dic_path = dic_path;
}

DictionaryLoader.prototype.loadArrayBuffer = async function (file) {
    throw new Error("DictionaryLoader#loadArrayBuffer should be overwrite");
};

/**
 * Load dictionary files
 * @param {DictionaryLoader~onLoad} load_callback Callback function called after loaded
 */
DictionaryLoader.prototype.load = function (load_callback) {
    var dic = this.dic;
    var dic_path = this.dic_path;
    var loadArrayBuffer = this.loadArrayBuffer;

    const async_map = async (fns) => {
        const buf = [];
        for (const fn of fns) {
            buf.push(await loadArrayBuffer(dic_path + fn));
        }
        return buf;
    };
    Promise.all([
        // Trie
        (async () => {
            const buffers = await async_map(["base.dat.gz", "check.dat.gz"]);
            const base_buffer = new Int32Array(buffers[0]);
            const check_buffer = new Int32Array(buffers[1]);
            dic.loadTrie(base_buffer, check_buffer);
        })(),
        // Token info dictionaries
        (async () => {
            const buffers = await async_map(["tid.dat.gz", "tid_pos.dat.gz", "tid_map.dat.gz"]);
            var token_info_buffer = new Uint8Array(buffers[0]);
            var pos_buffer = new Uint8Array(buffers[1]);
            var target_map_buffer = new Uint8Array(buffers[2]);
            dic.loadTokenInfoDictionaries(token_info_buffer, pos_buffer, target_map_buffer);
        })(),
        // Connection cost matrix
        (async () => {
            const buffers = await async_map(["cc.dat.gz"]);
            var cc_buffer = new Int16Array(buffers[0]);
            dic.loadConnectionCosts(cc_buffer);
        })(),
        // Unknown dictionaries
        (async () => {
            const buffers = await async_map(["unk.dat.gz", "unk_pos.dat.gz", "unk_map.dat.gz", "unk_char.dat.gz", "unk_compat.dat.gz", "unk_invoke.dat.gz"]);
            var unk_buffer = new Uint8Array(buffers[0]);
            var unk_pos_buffer = new Uint8Array(buffers[1]);
            var unk_map_buffer = new Uint8Array(buffers[2]);
            var cat_map_buffer = new Uint8Array(buffers[3]);
            var compat_cat_map_buffer = new Uint32Array(buffers[4]);
            var invoke_def_buffer = new Uint8Array(buffers[5]);

            dic.loadUnknownDictionaries(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
            // dic.loadUnknownDictionaries(char_buffer, unk_buffer);
        })(),
    ]).then(() => load_callback(null, dic)).catch((err) => load_callback(err, dic));
};

/**
 * Callback
 * @callback DictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {DynamicDictionaries} dic Loaded dictionary
 */
