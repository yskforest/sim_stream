const AppState = {
            couch: { y: 0, z: 0 },
            gantry: { 
                isScanning: false, 
                rotorSpeed: 0, 
                angle: 0, 
                xrayVisible: false, 
                detectorRows: 320, 
                scanSequence: [{mode: 'scano', delay: 0}, {mode: 'helical', delay: 3}], 
                activeBatchIndex: -1, 
                currentScanMode: 'scano',
                injectorSyncIndex: -1,
                countdown: 0,
                cancelRequested: false
            },
            injector: { a: 0, b: 0 },
            patientVisible: true,

            listeners: [],
            subscribe(callback) { this.listeners.push(callback); },
            update(key, subKey, value) {
                if (this[key] && this[key][subKey] !== undefined) {
                    this[key][subKey] = value;
                    this.notify();
                }
            },
            notify() {
                this.listeners.forEach(cb => cb(this));
                updateStateMonitor();
                renderBatchUI();
            }
        };

        const Descriptions = {
            // Focus Targets
            'SCON': 'SCON (System Control Node)\n\nCT郢ｧ・ｷ郢ｧ・ｹ郢昴・ﾎ定怦・ｨ闖ｴ阮呻ｽ帝お・ｱ隲｡・ｬ邵ｺ蜷ｶ・狗ｹ晢ｽ｡郢ｧ・､郢晢ｽｳ郢ｧ・ｳ郢晢ｽｳ郢晏現ﾎ溽ｹ晢ｽｼ郢晢ｽｩ郢晢ｽｼ邵ｺ・ｧ邵ｺ蜷ｶﾂ繧・′郢晏｣ｹﾎ樒ｹ晢ｽｼ郢ｧ・ｿ郢晢ｽｼ邵ｺ荵晢ｽ臥ｸｺ・ｮ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ隰悶・・､・ｺ郢ｧ雋槫･ｳ邵ｺ螟ｧ蜿咏ｹｧ鄙ｫﾂ竏晄耳郢晏ｼｱ繝ｻ郢晏ｳｨ竊馴ｩ包ｽｩ陋ｻ繝ｻ竊醍ｹｧ・ｷ郢晢ｽｼ郢ｧ・ｱ郢晢ｽｳ郢ｧ・ｹ邵ｺ・ｨ郢昜ｻ｣ﾎ帷ｹ晢ｽ｡郢晢ｽｼ郢ｧ・ｿ郢晢ｽｼ郢ｧ蟶昴・闖ｫ・｡邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            'DCON': 'DCON (Data Control Node)\n\n郢ｧ・ｬ郢晢ｽｳ郢晏現ﾎ懆怙繝ｻ繝ｻ隶諛ｷ繝ｻ陜趣ｽｨ繝ｻ繝ｻAS繝ｻ蟲ｨﾂｰ郢ｧ迚吶・郢晁ｼ斐＜郢ｧ・､郢晁・繝ｻ驍ｨ讙守ｽｰ邵ｺ・ｧ鬨ｾ竏夲ｽ臥ｹｧ蠕娯ｻ邵ｺ荳奇ｽ矩婿・ｨ陞滂ｽｧ邵ｺ・ｪ騾墓ｺ倥Ι郢晢ｽｼ郢ｧ・ｿ郢ｧ蛛ｵﾎ懃ｹｧ・｢郢晢ｽｫ郢ｧ・ｿ郢ｧ・､郢晢｣ｰ邵ｺ・ｧ陷ｿ蠍ｺ・ｿ・｡邵ｺ蜉ｱﾂ竏壹Σ郢昴・繝ｵ郢ｧ・｡郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ郢ｧ繝ｻ辯戊怎・ｦ騾・・・帝勗蠕鯉ｼ樒ｸｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'RTM': 'RTM (Real Time Monitor)\n\n郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ鬨ｾ・ｲ髯ｦ蠕｡・ｸ・ｭ邵ｺ・ｫ郢晢ｽｪ郢ｧ・｢郢晢ｽｫ郢ｧ・ｿ郢ｧ・､郢晢｣ｰ邵ｺ・ｧ驍・ｽ｡隴城豪蝎ｪ邵ｺ・ｪ騾包ｽｻ陷剃ｸ槭・隶貞玄繝ｻ郢ｧ螳夲ｽ｡蠕鯉ｼ樒ｸｲ竏壹＆郢晢ｽｳ郢ｧ・ｽ郢晢ｽｼ郢晢ｽｫ郢晢ｽ｢郢昜ｹ昴■郢晢ｽｼ邵ｺ・ｫ郢晏干ﾎ樒ｹ晁侭ﾎ礼ｹ晢ｽｼ騾包ｽｻ陷剃ｸ奇ｽ帝勗・ｨ驕会ｽｺ邵ｺ蜷ｶ・狗ｸｺ貅假ｽ∫ｸｺ・ｮ陝・ｉ逡醍ｹ晏ｼｱ繝ｻ郢晏ｳｨ縲堤ｸｺ蜷ｶﾂ繝ｻ,
            'IDD': 'IDD (Image Data Disk)\n\n陷閧ｴ・ｧ蛹ｺ繝ｻ郢ｧ・ｨ郢晢ｽｳ郢ｧ・ｸ郢晢ｽｳ邵ｺ・ｫ郢ｧ蛹ｻ笆ｲ邵ｺ・ｦ騾墓ｻ薙・邵ｺ霈費ｽ檎ｸｺ貊・ｽｫ蛟｡・ｲ・ｾ驍擾ｽｰ邵ｺ・ｪDICOM騾包ｽｻ陷剃ｸ翫Ι郢晢ｽｼ郢ｧ・ｿ郢ｧ蟶晢ｽｫ蛟ｬﾂ貅伉ｰ邵ｺ・､陞ｳ迚吶・邵ｺ・ｫ闖ｫ譎擾ｽｭ蛟･笘・ｹｧ荵昶螺郢ｧ竏壹・邵ｲ竏晢ｽ､・ｧ陞ｳ・ｹ鬩･荳翫○郢晏現ﾎ樒ｹ晢ｽｼ郢ｧ・ｸ郢ｧ・｢郢晢ｽｬ郢ｧ・､繝ｻ繝ｻAID隶貞玄繝ｻ繝ｻ蟲ｨ縲堤ｸｺ蜷ｶﾂ繝ｻ,
            'RDD': 'RDD (Raw Data Disk)\n\n隶諛ｷ繝ｻ陜趣ｽｨ邵ｺ荵晢ｽ芽愾髢・ｾ蜉ｱ・邵ｺ貊捺ざ陷・ｽｦ騾・・繝ｻ郢晢ｽｭ郢晢ｽｼ郢昴・繝ｻ郢ｧ・ｿ郢ｧ蜑・ｽｸﾂ隴弱ｉ蝎ｪ邵ｺ・ｫ髣｢繝ｻ・ｩ髦ｪ笘・ｹｧ遏ｩ・ｫ蛟ｬﾂ貅倥○郢晏現ﾎ樒ｹ晢ｽｼ郢ｧ・ｸ邵ｺ・ｧ邵ｺ蜷ｶﾂ繧・○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ陟募ｾ後・陷蟠趣ｽｨ閧ｲ・ｮ證ｦ・ｼ蛹ｻﾎ樒ｹ晏現ﾎ溽ｹｧ・ｹ郢晏｣ｹ縺醍ｹ昴・縺・ｹ晞摩繝ｻ隶貞玄繝ｻ繝ｻ蟲ｨ竊楢抄・ｿ騾包ｽｨ邵ｺ霈費ｽ檎ｸｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'SAC': 'SAC (Scan Array Controller)\n\n郢ｧ・ｬ郢晢ｽｳ郢晏現ﾎ懃ｸｺ・ｮ陜玲ｫ・ｽｻ・｢鬨ｾ貅ｷ・ｺ・ｦ繝ｻ蛹ｻﾎ溽ｹ晢ｽｼ郢ｧ・ｿ郢晢ｽｼ陋ｻ・ｶ陟包ｽ｡繝ｻ蟲ｨﾂ縲・こ螟ゑｽｮ・｡騾・・繝ｻ霎｣・ｧ陝・・縺｡郢ｧ・､郢晄ｺ佩ｦ郢ｧ・ｰ邵ｲ竏晢ｽｯ譎丞ｺ翫・蛹ｻ縺咲ｹｧ・ｦ郢昴・・ｼ蟲ｨ繝ｻ驕假ｽｻ陷肴坩ﾂ貅ｷ・ｺ・ｦ郢ｧ蛛ｵ繝ｻ郢ｧ・､郢ｧ・ｯ郢晢ｽｭ驕倩ｲ櫁・闖ｴ髦ｪ縲帝ｬｮ蛟｡・ｲ・ｾ陟趣ｽｦ邵ｺ・ｫ陷ｷ譴ｧ謔・崕・ｶ陟包ｽ｡邵ｺ蜷ｶ・狗ｹ昜ｸ翫・郢晏ｳｨ縺育ｹｧ・ｧ郢ｧ・｢郢晢ｽｦ郢昜ｹ昴Ε郢晏現縲堤ｸｺ蜷ｶﾂ繝ｻ,
            'FullRack': 'Console BOX (Server Rack)\n\nCT郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晉ｿｫ繝ｻ鬯・ｽｭ髢ｼ・ｳ邵ｺ・ｨ邵ｺ・ｪ郢ｧ蜿･謗ｨ驕橸ｽｮ髫ｪ閧ｲ・ｮ蜉ｱ繝ｮ郢晢ｽｼ郢晏ｳｨﾂ竏晏ｮ幄包ｽ｡郢晏ｼｱ繝ｻ郢晏ｳｨﾂ竏晢ｽ､・ｧ陞ｳ・ｹ鬩･荳翫○郢晏現ﾎ樒ｹ晢ｽｼ郢ｧ・ｸ邵ｺ譴ｧ・ｰ・ｼ驍城亂・・ｹｧ蠕娯螺19郢ｧ・､郢晢ｽｳ郢昶・縺礼ｹ晢ｽｼ郢晁・繝ｻ郢晢ｽｩ郢昴・縺醍ｸｺ・ｧ邵ｺ蜷ｶﾂ繧・ｽ､蜀ｶ・｣繝ｻ・帝具ｽｽ郢晏生繝ｻ郢ｧ・ｹ邵ｺ・ｫ邵ｺ蜉ｱﾂ竏ｵ・ｸ繝ｻ・ｽ逍ｲ笏邵ｺ・ｨ髫募・・ｪ閧ｴﾂ・ｧ郢ｧ雋樣ｫ・叉鄙ｫ・・ｸｺ蟶吮ｻ邵ｺ繝ｻ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            'Injector': 'Injector (郢ｧ・､郢晢ｽｳ郢ｧ・ｸ郢ｧ・ｧ郢ｧ・ｯ郢ｧ・ｿ)\n\n鬨ｾ・ｰ陟厄ｽｱ陷托ｽ､邵ｺ・ｨ騾墓ｺｽ轤企ｬ滓ｺｷ・｡・ｩ雎鯉ｽｴ郢ｧ蟶昶・陋ｻ繝ｻ竊醍ｹｧ・ｿ郢ｧ・､郢晄ｺ佩ｦ郢ｧ・ｰ邵ｺ・ｨ陜ｨ・ｧ陷牙ｸ吶帝明・ｪ陷榊｢難ｽｳ・ｨ陷茨ｽ･邵ｺ蜷ｶ・矩勳繝ｻ・ｽ・ｮ邵ｺ・ｧ邵ｺ蜷ｶﾂ繧・○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ邵ｺ・ｨ鬨ｾ・｣陷崎ｼ費ｼ邵ｺ・ｦ陷咲ｩゑｽｽ諛奇ｼ邵ｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'Gantry': 'CT Gantry (CT郢ｧ・ｬ郢晢ｽｳ郢晏現ﾎ・\n\nX驍ｱ螟ゑｽｮ・｡騾・・・・ｮ諛ｷ繝ｻ陜趣ｽｨ郢ｧ雋槭・髦｡・ｵ邵ｺ蜉ｱﾂ繝ｻ・ｫ蛟ｬﾂ貅倥定摎讚・ｽｻ・｢邵ｺ蜉ｱ竊醍ｸｺ蠕鯉ｽ臥ｹ昴・繝ｻ郢ｧ・ｿ郢ｧ雋槫ｺｶ鬮ｮ繝ｻ笘・ｹｧ豌裕邵ｺ・ｮ隴幢ｽｬ闖ｴ鬥ｴﾎ夊崕繝ｻ縲堤ｸｺ蜷ｶﾂ繧・・鬩幢ｽｨ邵ｺ・ｧ邵ｺ・ｯ1驕伜ｸ昜ｿ｣邵ｺ・ｫ隰ｨ・ｰ陜玲ｫ・ｽｻ・｢邵ｺ蜷ｶ・矩ｊ・ｾ陝・・竊題崕・ｶ陟包ｽ｡邵ｺ迹夲ｽ｡蠕鯉ｽ冗ｹｧ蠕娯ｻ邵ｺ繝ｻ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            'Couch': 'CT Couch (CT陝・剌蠎・\n\n隰費ｽ｣髢繝ｻ窶ｲ隶難ｽｪ邵ｺ貅假ｽ冗ｹｧ蜿･・ｯ譎丞ｺ顔ｸｺ・ｧ邵ｺ蜷ｶﾂ繧・○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ闕ｳ・ｭ邵ｺ・ｫ郢ｧ・ｬ郢晢ｽｳ郢晏現ﾎ懆怙繝ｻ・堤ｹｧ・ｵ郢晄じﾎ醍ｹ晢ｽｪ陷雁・ｽｽ髦ｪ繝ｻ雎・ｽ｣驕抵ｽｺ邵ｺ・ｪ鬨ｾ貅ｷ・ｺ・ｦ邵ｺ・ｨ闖ｴ蜥ｲ・ｽ・ｮ邵ｺ・ｧ驕假ｽｻ陷崎ｼ費ｼ邵ｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'TouchPanel': 'CT Touch Panel (CT郢ｧ・ｿ郢昴・繝｡郢昜ｻ｣繝ｭ郢晢ｽｫ)\n\n郢ｧ・ｬ郢晢ｽｳ郢晏現ﾎ懆恆蝓ｼ謫・ｸｺ・ｫ鬩溷調・ｽ・ｮ邵ｺ霈費ｽ檎ｸｲ竏ｵ縺・蔓繝ｻ繝ｻ闖ｴ蜥ｲ・ｽ・ｮ雎趣ｽｺ郢ｧ竏夲ｽ・汞譎丞ｺ顔ｸｺ・ｮ闕ｳ雍具ｽｸ迢暦ｽｧ・ｻ陷崎ｼ板竏墅樒ｹ晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢晄亢縺・ｹ晢ｽｳ郢ｧ・ｿ郢晢ｽｼ邵ｺ・ｮ隰ｫ蝣ｺ・ｽ諛岩・邵ｺ・ｩ郢ｧ蝣､蟲ｩ隲｢貅ｽ蝎ｪ邵ｺ・ｫ髯ｦ蠕娯鴬邵ｺ貅假ｽ∫ｸｺ・ｮ郢ｧ・､郢晢ｽｳ郢ｧ・ｿ郢晢ｽｼ郢晁ｼ斐♂郢晢ｽｼ郢ｧ・ｹ邵ｺ・ｧ邵ｺ蜷ｶﾂ繝ｻ,
            'XrayTube': 'X-ray Tube (X驍ｱ螟ゑｽｮ・｡騾・・\n\n鬯ｮ蛟ｬ蟠戊舉・ｧ郢ｧ蛛ｵﾂｰ邵ｺ莉｣窶ｻ鬮ｮ・ｻ陝・鴻・ｷ螢ｹ・堤ｹｧ・ｿ郢晢ｽｼ郢ｧ・ｲ郢昴・繝ｨ邵ｺ・ｫ髯ｦ譎会ｽｪ竏夲ｼ・ｸｺ蟶呻ｽ狗ｸｺ阮吮・邵ｺ・ｧ邵ｲ竏ｽ・ｺ・ｺ闖ｴ阮呻ｽ帝ｨｾ蝓寂с邵ｺ蜷ｶ・宜驍ｱ螢ｹ・帝具ｽｺ騾墓ｺ假ｼ・ｸｺ蟶呻ｽ玖｢繝ｻ竏ｮ鬩幢ｽｨ邵ｺ・ｧ邵ｺ蜷ｶﾂ繧区直陝ｶ・ｸ邵ｺ・ｫ鬯ｮ菫ｶ・ｸ・ｩ邵ｺ・ｫ邵ｺ・ｪ郢ｧ荵昶螺郢ｧ竏晢ｽｼ・ｷ陷牙ｸ吮・陷・ｷ陷奇ｽｴ隶匁ｻ難ｽｧ荵晢ｽ定岷蜷ｶ竏ｴ邵ｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            'Detector': 'Detector (郢昴・縺・ｹ昴・縺醍ｹｧ・ｿ / 隶諛ｷ繝ｻ陜趣ｽｨ)\n\n闔・ｺ闖ｴ阮呻ｽ帝ｨｾ蝓寂с邵ｺ蜉ｱ笳・驍ｱ螢ｹ・定ｮ諛・｡咲ｸｺ蜉ｱﾂ竏昴・闖ｫ・｡陷ｿ・ｷ邵ｺ荵晢ｽ蛾ｫｮ・ｻ雎悟ｶｺ・ｿ・｡陷ｿ・ｷ邵ｺ・ｸ陞溽判驪､邵ｺ蜷ｶ・矩ｬｮ菫ｶ笏陟趣ｽｦ邵ｺ・ｪ郢ｧ・ｻ郢晢ｽｳ郢ｧ・ｵ郢晢ｽｼ郢ｧ・｢郢晢ｽｬ郢ｧ・､邵ｺ・ｧ邵ｺ蜷ｶﾂ繧・ｽ､螢ｼ繝ｻCT邵ｺ・ｧ邵ｺ・ｯ隰ｨ・ｰ騾具ｽｾ陋ｻ蜉ｱ・らｸｺ・ｮ郢ｧ・ｻ郢晢ｽｳ郢ｧ・ｵ郢晢ｽｼ邵ｺ蠕｡・ｸ・ｦ邵ｺ・ｳ邵ｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'ConsoleDisplay': 'Console Display (郢ｧ・ｳ郢晢ｽｳ郢ｧ・ｽ郢晢ｽｼ郢晢ｽｫ郢昴・縺・ｹｧ・ｹ郢晏干ﾎ樒ｹｧ・､)\n\n郢ｧ・ｪ郢晏｣ｹﾎ樒ｹ晢ｽｼ郢ｧ・ｿ郢晢ｽｼ邵ｺ蠕後○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ髫ｪ閧ｲ蛻､繝ｻ蛹ｻ繝ｻ郢晢ｽｭ郢晏現縺慕ｹ晢ｽｫ髫ｪ・ｭ陞ｳ螟ｲ・ｼ蟲ｨ・帝・荵昶ｻ邵ｲ竏昴・隶貞玄繝ｻ邵ｺ霈費ｽ檎ｸｺ貅ｽ蛻､陷剃ｸ奇ｽ堤ｹ晢ｽｪ郢ｧ・｢郢晢ｽｫ郢ｧ・ｿ郢ｧ・､郢晢｣ｰ邵ｺ・ｫ驕抵ｽｺ髫ｱ髦ｪ繝ｻ髫暦ｽ｣隴ｫ闊娯・郢ｧ荵昶螺郢ｧ竏壹・隰ｫ蝣ｺ・ｽ諛莞皮ｹ昜ｹ昴■郢晢ｽｼ邵ｺ・ｧ邵ｺ蜷ｶﾂ繝ｻ,
            'OperationSwitcher': 'Operation Switcher (隰ｫ蝣ｺ・ｽ諛翫○郢ｧ・､郢昴・繝｡郢晢ｽ｣)\n\n郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ邵ｺ・ｮ鬮｢蜿･・ｧ荵昴・陋帶㊧・ｭ・｢邵ｲ竏晢ｽｯ譎丞ｺ顔ｸｺ・ｮ驍ｱ鬆堕・･陋帶㊧・ｭ・｢邵ｺ・ｪ邵ｺ・ｩ郢ｧ蝣､鮟・・・繝ｻ郢ｧ・ｿ郢晢ｽｳ邵ｺ・ｧ陷奇ｽｳ陟趣ｽｧ邵ｺ・ｫ髯ｦ蠕娯鴬邵ｺ貅假ｽ∫ｸｺ・ｮ陝・ｉ逡醍ｹ昴・繝ｰ郢ｧ・､郢ｧ・ｹ邵ｺ・ｧ邵ｺ蜷ｶﾂ繧牙ｳｩ隲｢貅ｽ蝎ｪ邵ｺ・ｪ隰ｫ蝣ｺ・ｽ諛岩・陞ｳ迚吶・隲､・ｧ邵ｺ・ｮ邵ｺ貅假ｽ∫ｸｺ・ｫ郢昜ｸ翫・郢晏ｳｨ縺育ｹｧ・ｧ郢ｧ・｢郢ｧ・ｹ郢ｧ・､郢昴・繝｡邵ｺ譴ｧ豐ｻ騾包ｽｨ邵ｺ霈費ｽ檎ｸｺ・ｦ邵ｺ繝ｻ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            
            // Scan Modes
            'helical': 'Helical Scan (郢晏･ﾎ懃ｹｧ・ｫ郢晢ｽｫ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ)\n\n陝・剌蠎顔ｹｧ蜑・ｽｸﾂ陞ｳ螟青貅ｷ・ｺ・ｦ邵ｺ・ｧ驕假ｽｻ陷崎ｼ費ｼ・ｸｺ蟶吮・邵ｺ蠕鯉ｽ厩驍ｱ螟ゑｽｮ・｡郢ｧ蟶敖・｣驍ｯ螢ｼ螻馴怕・｢邵ｺ霈披雷邵ｲ竏夲ｽ臥ｸｺ蟶呻ｽ楢ｿ･・ｶ邵ｺ・ｫ郢昴・繝ｻ郢ｧ・ｿ郢ｧ雋槫ｺｶ鬮ｮ繝ｻ笘・ｹｧ荵敖竏ｫ讓溯舉・ｨ邵ｺ・ｮCT邵ｺ・ｮ闕ｳ・ｻ雎ｬ竏壺・邵ｺ・ｪ郢ｧ遏ｩ・ｫ蛟ｬﾂ貅倥○郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ縲堤ｸｺ蜷ｶﾂ繝ｻ,
            'axial': 'Axial Scan (郢ｧ・｢郢ｧ・ｭ郢ｧ・ｷ郢晢ｽ｣郢晢ｽｫ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ)\n\n陝・剌蠎顔ｹｧ蜑・ｽｸﾂ陞ｳ螟蝉ｿ｣鬮ｫ譁舌定屁諛茨ｽｭ・｢邵ｺ霈披雷邵ｲ竏壺落邵ｺ・ｮ陜｣・ｴ邵ｺ・ｧ1陜玲ｫ・ｽｻ・｢郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ螳夲ｽ｡蠕娯鴬邵ｲ蠕後○郢昴・繝｣郢晏干繝ｻ郢ｧ・｢郢晢ｽｳ郢晏ｳｨ繝ｻ郢ｧ・ｷ郢晢ｽ･郢晢ｽｼ郢晏現ﾂ閧ｴ蟀ｿ陟台ｸ翫堤ｸｺ蜷ｶﾂ繧・ｽｸ・ｻ邵ｺ・ｫ鬯・ｽｭ鬩幢ｽｨ鬯・ｼ懈ｲｺ郢ｧ繝ｻ・ｫ莨懊・髫暦ｽ｣髢ｭ・ｽ邵ｺ譴ｧ・ｱ繧・ｽ∫ｹｧ蟲ｨ・檎ｹｧ遏ｩﾎ夊抄髦ｪ縲定抄・ｿ騾包ｽｨ邵ｺ霈費ｽ檎ｸｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'scano': 'Scano (郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晏ｼｱ縺堤ｹ晢ｽｩ郢晢｣ｰ)\n\nX驍ｱ螟ゑｽｮ・｡郢ｧ繝ｻ陟趣ｽｦ繝ｻ閧ｲ謔・叉螂・ｽｼ蟲ｨ竊楢摎・ｺ陞ｳ螢ｹ・邵ｺ貅ｽ諞ｾ隲ｷ荵昴定汞譎丞ｺ顔ｹｧ蝣､・ｧ・ｻ陷崎ｼ費ｼ・ｸｺ蟶卍縲・こ螢ｹ繝ｻ鬨ｾ蝓寂с騾包ｽｻ陷剃ｸ奇ｽ定ｬｦ・ｮ陟厄ｽｱ邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂ繧域た郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ邵ｺ・ｮ隰ｦ・ｮ陟厄ｽｱ驕ｽ繝ｻ蟲・ｹｧ蜻茨ｽｱ・ｺ郢ｧ竏夲ｽ狗ｸｺ貅假ｽ∫ｸｺ・ｮ闖ｴ蜥ｲ・ｽ・ｮ雎趣ｽｺ郢ｧ竏ｫ蛻､陷剃ｸ岩・邵ｺ蜉ｱ窶ｻ闖ｴ・ｿ騾包ｽｨ邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂ繝ｻ,
            'dual_scano': 'Dual Scano (郢昴・ﾎ礼ｹｧ・｢郢晢ｽｫ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢昴・\n\n雎・ｽ｣鬮ｱ・｢邵ｺ・ｨ陋幢ｽｴ鬮ｱ・｢邵ｺ・ｮ2隴・ｽｹ陷ｷ莉｣ﾂｰ郢ｧ蟲ｨ縺帷ｹｧ・ｭ郢晢ｽ｣郢晏ｼｱ縺堤ｹ晢ｽｩ郢晢｣ｰ郢ｧ蜻郁・陟厄ｽｱ邵ｺ蜉ｱ竏ｪ邵ｺ蜷ｶﾂ繧・ｽ育ｹｧ鬆托ｽｭ・｣驕抵ｽｺ邵ｺ・ｪ闖ｴ蜥ｲ・ｽ・ｮ雎趣ｽｺ郢ｧ竏夲ｽ・ｸｲ竏ｬ・｢・ｫ邵ｺ・ｰ邵ｺ荳茨ｽｽ蜿厄ｽｸ蟶吶・邵ｺ貅假ｽ∫ｸｺ・ｮ髢ｾ・ｪ陷肴坩蟠戊ｱｬ竏晢ｽ､闃ｽ・ｪ・ｿ繝ｻ繝ｻEC繝ｻ蟲ｨ繝ｻ髫ｪ閧ｲ・ｮ蜉ｱ竊楢厄ｽｹ驕ｶ荵昶蔓邵ｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            '3d_landmark': '3D Landmark (3D郢晢ｽｩ郢晢ｽｳ郢晏ｳｨ繝ｻ郢晢ｽｼ郢ｧ・ｯ)\n\n闖ｴ螳茨ｽｷ螟舌詐邵ｺ・ｧ鬯ｮ蛟ｬﾂ貅倪・郢晏･ﾎ懃ｹｧ・ｫ郢晢ｽｫ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ螳夲ｽ｡蠕鯉ｼ樒ｸｲ繝ｻD邵ｺ・ｮ驍雁干・樒ｹ晄㈱ﾎ懃ｹ晢ｽ･郢晢ｽｼ郢晢｣ｰ郢昴・繝ｻ郢ｧ・ｿ郢ｧ蜑・ｽｽ諛医・邵ｺ蜉ｱ窶ｻ驍奇ｽｾ驍ｱ・ｻ邵ｺ・ｪ闖ｴ蜥ｲ・ｽ・ｮ雎趣ｽｺ郢ｧ竏夲ｽ帝勗蠕娯鴬郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ縲堤ｸｺ蜷ｶﾂ繝ｻ,
            'volume': 'Volume Scan (郢晄㈱ﾎ懃ｹ晢ｽ･郢晢ｽｼ郢晢｣ｰ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ)\n\n陟弱・・ｯ繝ｻ蟲・ｮ諛ｷ繝ｻ陜趣ｽｨ郢ｧ蝣､逡醍ｸｺ繝ｻﾂ竏晢ｽｯ譎丞ｺ顔ｹｧ雋櫁劒邵ｺ荵晢ｼ・ｸｺ螢ｹ竊・陜玲ｫ・ｽｻ・｢邵ｺ・ｧ髢ｾ轣伜競陷茨ｽｨ闖ｴ髮｣・ｼ莠･・ｿ繝ｻ竏ｮ郢ｧ繝ｻ笏ｻ邵ｺ・ｪ邵ｺ・ｩ繝ｻ蟲ｨ・定叉・ｸ邵ｺ譁絶・隰ｦ・ｮ陟厄ｽｱ邵ｺ蜷ｶ・狗ｹ晢ｽ｢郢晢ｽｼ郢晏ｳｨ縲堤ｸｺ蜷ｶﾂ繧・劒邵ｺ髦ｪ繝ｻ郢ｧ・｢郢晢ｽｼ郢昴・縺・ｹ晁ｼ斐＜郢ｧ・ｯ郢晏現・定ｮ鯉ｽｵ鬮ｯ闊娯穐邵ｺ・ｧ隰壻ｻ｣竏ｴ郢ｧ蟲ｨ・檎ｸｺ・ｾ邵ｺ蜷ｶﾂ繝ｻ,
            'dynamic': 'Dynamic Scan (郢敖郢ｧ・､郢晉ｿｫﾎ醍ｹ昴・縺醍ｹｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ)\n\n鬨ｾ・ｰ陟厄ｽｱ陷托ｽ､邵ｺ・ｮ雎ｬ竏昴・郢晢ｽｻ雎ｬ竏昴・郢晏干ﾎ溽ｹｧ・ｻ郢ｧ・ｹ郢ｧ繝ｻ譛ｪ驕ｽﾂ邵ｺ・ｮ陷崎ｼ披ｳ邵ｺ・ｪ邵ｺ・ｩ郢ｧ螳夲ｽｦ・ｳ陝・ｺ倪・郢ｧ荵昶螺郢ｧ竏堋竏晞・邵ｺ蛟・ｽｽ蜥ｲ・ｽ・ｮ邵ｺ・ｧ鬨ｾ・｣驍ｯ螢ｹ・邵ｺ・ｦ髫阪・辟夊摎讒ｭ繝ｻ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ蝣､・ｹ・ｰ郢ｧ鬘假ｽｿ譁絶・郢晢ｽ｢郢晢ｽｼ郢晏ｳｨ縲堤ｸｺ蜻ｻ・ｼ繝ｻD隰ｦ・ｮ陟厄ｽｱ繝ｻ蟲ｨﾂ繝ｻ,
            'real_prep': 'Real Prep (郢晢ｽｪ郢ｧ・｢郢晢ｽｫ郢晏干ﾎ樒ｹ昴・繝ｻ)\n\n鬨ｾ・ｰ陟厄ｽｱ陷托ｽ､邵ｺ讙主ｲｼ騾ｧ繝ｻ繝ｻ髯ｦﾂ驍ゑｽ｡郢ｧ繝ｻ竏ｮ陜趣ｽｨ邵ｺ・ｫ陋ｻ・ｰ鬩墓鱒・邵ｺ貅ｽ讀ｪ鬮｢阮呻ｽ定ｬ仙ｳｨ竏ｴ郢ｧ荵昶螺郢ｧ竏堋竏ｽ・ｽ螳茨ｽｷ螟舌詐邵ｺ・ｧ郢晢ｽ｢郢昜ｹ昴■郢晢ｽｪ郢晢ｽｳ郢ｧ・ｰ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ郢ｧ蝣､・ｹ・ｰ郢ｧ鬘假ｽｿ譁撰ｼ邵ｲ・卦陋滂ｽ､邵ｺ遒∵・陋滂ｽ､郢ｧ螳夲ｽｶ繝ｻ竏ｴ邵ｺ貅假ｽ芽ｭ幢ｽｬ郢ｧ・ｹ郢ｧ・ｭ郢晢ｽ｣郢晢ｽｳ邵ｺ・ｸ髢ｾ・ｪ陷肴・・ｧ・ｻ髯ｦ蠕娯・郢ｧ蛹ｺ・ｩ貅ｯ繝ｻ邵ｺ・ｧ邵ｺ蜷ｶﾂ繝ｻ
        };

        const UI = {};
        const Meshes = {};
        let scene, camera, renderer, controls, mixer;
        const clock = new THREE.Clock();

        init();
        animate();

        function init() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111115);
            scene.fog = new THREE.FogExp2(0x111115, 0.03);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.01;

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
            dirLight.position.set(5, 10, 5);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            scene.add(dirLight);

            const pointLight = new THREE.PointLight(0xddf0ff, 0.6, 5);
            pointLight.position.set(0, 1.2, 0);
            scene.add(pointLight);

            // --- Environment Build ---
            buildRoom();
            buildCTScanner();
            buildInjector();
            buildControlRoom();
            buildServerRack();

            // --- UI Setup ---
            setupUI();
            setCameraView('free');
            window.addEventListener('resize', onWindowResize);
            AppState.notify();
        }

        function buildRoom() {
            const floorGeo = new THREE.PlaneGeometry(30, 30);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.8 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            const grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
            grid.position.y = 0.01;
            scene.add(grid);
        }

        function createRoundedBox(width, height, depth, radius, material) {
            const shape = new THREE.Shape();
            const x = -width / 2;
            const y = -depth / 2;
            shape.moveTo(x, y + radius);
            shape.lineTo(x, y + depth - radius);
            shape.quadraticCurveTo(x, y + depth, x + radius, y + depth);
            shape.lineTo(x + width - radius, y + depth);
            shape.quadraticCurveTo(x + width, y + depth, x + width, y + depth - radius);
            shape.lineTo(x + width, y + radius);
            shape.quadraticCurveTo(x + width, y, x + width - radius, y);
            shape.lineTo(x + radius, y);
            shape.quadraticCurveTo(x, y, x, y + radius);

            const extrudeSettings = { depth: height, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, -height / 2, 0);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

        function buildCTScanner() {
            const ctGroup = new THREE.Group();

            const gantryGroup = new THREE.Group();
            gantryGroup.position.set(0, 1.2, 0);

            const gantryMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.3, metalness: 0.1 });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const baseCoverMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.6 });
            const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x66bbff });

            const tunnelMat = new THREE.MeshPhysicalMaterial({
                color: 0xeeeeee, transparent: false, opacity: 1.0,
                roughness: 0.2, transmission: 0.0, side: THREE.DoubleSide
            });

            const camFrameMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
            const camLensMat = new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.1, metalness: 0.8 });
            const panelBaseMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea });
            const screenMat = new THREE.MeshBasicMaterial({ color: 0xe0f0ff });
            const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x88bbdd });
            const btnMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const logoMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
            const ledRedMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
            const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });

            Meshes.materials = {
                gantry: gantryMat,
                base: baseCoverMat,
                tunnel: tunnelMat,
                accessories: [
                    darkMat, blueLightMat, camFrameMat, camLensMat,
                    panelBaseMat, screenMat, silhouetteMat, btnMat,
                    logoMat, ledRedMat, ledGreenMat
                ]
            };

            const shape = new THREE.Shape();
            const w = 1.35;
            const b = -1.15;

            shape.moveTo(w, b);
            shape.lineTo(w, 0);
            shape.absarc(0, 0, w, 0, Math.PI, false);
            shape.lineTo(-w, b);
            shape.lineTo(w, b);

            const boreRadius = 0.65;
            const hole = new THREE.Path();
            hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
            shape.holes.push(hole);

            const extrudeSettings = {
                depth: 0.5, curveSegments: 64,
                bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.15, bevelSegments: 32
            };
            const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            bodyGeo.translate(0, 0, -0.25);
            const mainBody = new THREE.Mesh(bodyGeo, gantryMat);
            mainBody.castShadow = true; mainBody.receiveShadow = true;
            gantryGroup.add(mainBody);

            const taperPoints = [];
            const tunnelRadius = 0.46;
            const taperDepth = 0.1;
            for (let i = 0; i <= 30; i++) {
                const t = i / 30;
                const r = tunnelRadius + (boreRadius - tunnelRadius) * Math.sin(t * Math.PI / 2);
                const y = taperDepth * t;
                taperPoints.push(new THREE.Vector2(r, y));
            }
            const taperGeo = new THREE.LatheGeometry(taperPoints, 64);

            const frontTaper = new THREE.Mesh(taperGeo, gantryMat);
            frontTaper.rotation.x = -Math.PI / 2; // 隰・唱辯慕ｸｺ・ｸ陷ｷ莉｣・･
            frontTaper.position.z = 0.15; 
            frontTaper.receiveShadow = true;
            gantryGroup.add(frontTaper);

            const rearTaper = new THREE.Mesh(taperGeo, gantryMat);
            rearTaper.rotation.x = Math.PI / 2; // 陞ゑｽ･邵ｺ・ｸ陷ｷ莉｣・･
            rearTaper.position.z = -0.15; 
            rearTaper.receiveShadow = true;
            gantryGroup.add(rearTaper);

            const tunnelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.3, 64, 1, true);
            const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
            tunnel.rotation.x = Math.PI / 2;
            gantryGroup.add(tunnel);

            const ringGeo = new THREE.TorusGeometry(0.462, 0.008, 16, 64);
            const ringFront = new THREE.Mesh(ringGeo, blueLightMat);
            ringFront.position.z = 0.14; 
            gantryGroup.add(ringFront);

            const ringRear = ringFront.clone();
            ringRear.position.z = -0.14; 
            gantryGroup.add(ringRear);

            const gantryBase = createRoundedBox(2.7, 0.1, 1.0, 0.1, baseCoverMat);
            gantryBase.position.set(0, -1.15, 0);
            gantryGroup.add(gantryBase);

            const slitPlaneGeo = new THREE.PlaneGeometry(0.35, 0.02);
            for (let i = 0; i < 4; i++) {
                const slitR = new THREE.Mesh(slitPlaneGeo, darkMat);
                slitR.position.set(1.31, -0.3 - i * 0.12, 0.35);
                gantryGroup.add(slitR);

                const slitL = new THREE.Mesh(slitPlaneGeo, darkMat);
                slitL.position.set(-1.31, -0.3 - i * 0.12, 0.35);
                gantryGroup.add(slitL);
            }

            const frontZ = 0.395;

            function createCamera(x, y) {
                const camGroup = new THREE.Group();
                camGroup.position.set(x, y, frontZ);

                camGroup.lookAt(new THREE.Vector3(0, -0.2, 2.0));

                const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32), camFrameMat);
                frame.rotation.x = Math.PI / 2;

                const lens = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16), camLensMat);
                lens.scale.z = 0.5;
                lens.position.z = 0.01;

                camGroup.add(frame); camGroup.add(lens);
                return camGroup;
            }

            gantryGroup.add(createCamera(0, 0.82));
            gantryGroup.add(createCamera(-0.82, 0));

            function createControlPanel(x, y) {
                const panelGroup = new THREE.Group();
                panelGroup.position.set(x, y, frontZ);
                panelGroup.rotation.y = 0;

                const baseGeo = new THREE.BoxGeometry(0.26, 0.45, 0.02);
                const base = new THREE.Mesh(baseGeo, panelBaseMat);
                panelGroup.add(base);

                const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), screenMat);
                screen.position.set(0, 0.08, 0.011);
                const head = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), silhouetteMat);
                head.position.set(0, 0.07, 0.001);
                const body = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.09), silhouetteMat);
                body.position.set(0, -0.01, 0.001);
                screen.add(head); screen.add(body);
                panelGroup.add(screen);

                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 3; j++) {
                        const btn = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), btnMat);
                        btn.position.set(-0.06 + j * 0.06, -0.12 - i * 0.06, 0.011);
                        panelGroup.add(btn);
                    }
                }
                return panelGroup;
            }

            gantryGroup.add(createControlPanel(0.8, 0.35));
            gantryGroup.add(createControlPanel(-0.8, 0.35));

            const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.04), logoMat);
            logo.position.set(0, 1.15, 0.42);
            gantryGroup.add(logo);

            const ledRed = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledRedMat);
            ledRed.position.set(-0.6, 1.05, 0.42);
            gantryGroup.add(ledRed);

            const ledGreen = new THREE.Mesh(new THREE.CircleGeometry(0.01, 16), ledGreenMat);
            ledGreen.position.set(0.6, 1.05, 0.42);
            gantryGroup.add(ledGreen);

            const rotorGroup = new THREE.Group();

            const rotorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.25, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x222, side: THREE.DoubleSide }));
            rotorRing.rotation.x = Math.PI / 2;
            rotorGroup.add(rotorRing);

            const tubeGroup = new THREE.Group();
            tubeGroup.position.set(0, 0.52, 0);

            const caseGeo = new THREE.BoxGeometry(0.38, 0.14, 0.22);
            const caseMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6 });
            tubeGroup.add(new THREE.Mesh(caseGeo, caseMat));

            const anodeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 32);
            const anodeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
            const anode = new THREE.Mesh(anodeGeo, anodeMat);
            anode.rotation.z = Math.PI / 2;
            anode.position.y = 0.02;
            tubeGroup.add(anode);

            const collimatorGeo = new THREE.BoxGeometry(0.08, 0.05, 0.12);
            const collimatorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const collimator = new THREE.Mesh(collimatorGeo, collimatorMat);
            collimator.position.y = -0.07;
            tubeGroup.add(collimator);

            rotorGroup.add(tubeGroup);

            const detectorGroup = new THREE.Group();
            const detectorAngle = Math.PI / 2.2;
            const rIn = 0.52;
            const rOut = 0.56;
            const startAngle = -Math.PI / 2 - detectorAngle / 2;
            const endAngle = -Math.PI / 2 + detectorAngle / 2;

            const detShape = new THREE.Shape();
            detShape.moveTo(rIn * Math.cos(startAngle), rIn * Math.sin(startAngle));
            detShape.absarc(0, 0, rOut, startAngle, endAngle, false);
            detShape.lineTo(rIn * Math.cos(endAngle), rIn * Math.sin(endAngle));
            detShape.absarc(0, 0, rIn, endAngle, startAngle, true);

            const baseDepth = 0.16;
            const detExtrude = { depth: baseDepth, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 64 };
            const detGeo = new THREE.ExtrudeGeometry(detShape, detExtrude);
            detGeo.translate(0, 0, -baseDepth / 2);
            const detMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.6 });
            detectorGroup.add(new THREE.Mesh(detGeo, detMat));

            const senShape = new THREE.Shape();
            const sIn = 0.518;
            const sOut = 0.521;
            senShape.moveTo(sIn * Math.cos(startAngle), sIn * Math.sin(startAngle));
            senShape.absarc(0, 0, sOut, startAngle, endAngle, false);
            senShape.lineTo(sIn * Math.cos(endAngle), sIn * Math.sin(endAngle));
            senShape.absarc(0, 0, sIn, endAngle, startAngle, true);

            const senDepth = 0.15;
            const senGeo = new THREE.ExtrudeGeometry(senShape, { depth: senDepth, bevelEnabled: false, curveSegments: 64 });
            senGeo.translate(0, 0, -senDepth / 2);
            const senMat = new THREE.MeshStandardMaterial({ color: 0x0088cc, metalness: 0.7, roughness: 0.2 });
            detectorGroup.add(new THREE.Mesh(senGeo, senMat));

            const wireMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, wireframe: true, transparent: true, opacity: 0.3 });
            detectorGroup.add(new THREE.Mesh(senGeo, wireMat));

            rotorGroup.add(detectorGroup);
            Meshes.detectorGroup = detectorGroup;

            const beamHeight = 1.04;
            const beamGeo = new THREE.ConeGeometry(0.6, beamHeight, 4, 1, true);
            beamGeo.rotateY(Math.PI / 4);
            beamGeo.translate(0, -beamHeight / 2, 0);

            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xffff00, transparent: true, opacity: 0.0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const xrayBeam = new THREE.Mesh(beamGeo, beamMat);
            xrayBeam.position.set(0, 0.5, 0);

            xrayBeam.scale.set(1.6, 1.0, 0.16);

            rotorGroup.add(xrayBeam);
            Meshes.xrayBeam = xrayBeam;

            gantryGroup.add(rotorGroup);
            Meshes.rotor = rotorGroup;
            ctGroup.add(gantryGroup);

            const couchGroup = new THREE.Group();

            const couchBase = createRoundedBox(0.8, 0.2, 1.8, 0.15, baseCoverMat);
            couchBase.position.set(0, 0.1, 2.6);
            couchGroup.add(couchBase);

            const bellowsGroup = new THREE.Group();
            bellowsGroup.position.set(0, 0.2, 2.6);
            const bellowsCount = 6;
            const bellowsParts = [];
            const bellowsMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.9 });
            for (let i = 0; i < bellowsCount; i++) {
                const width = 0.75 - (i * 0.025);
                const depth = 1.75 - (i * 0.04);
                const bMesh = createRoundedBox(width, 0.1, depth, 0.1, bellowsMat);
                bellowsParts.push(bMesh);
                bellowsGroup.add(bMesh);
            }
            couchGroup.add(bellowsGroup);
            Meshes.bellows = bellowsParts;

            const tabletopGroup = new THREE.Group();
            tabletopGroup.position.set(0, 0.8, 2.6);

            const supportMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
            const supportBase = createRoundedBox(0.72, 0.18, 2.2, 0.1, supportMat);
            supportBase.position.y = -0.09;
            tabletopGroup.add(supportBase);

            const footCover = createRoundedBox(0.75, 0.22, 0.5, 0.15, supportMat);
            footCover.position.set(0, -0.07, 0.9);
            tabletopGroup.add(footCover);

            const handle = createRoundedBox(0.4, 0.05, 0.1, 0.02, darkMat);
            handle.position.set(0, -0.05, 1.15);
            tabletopGroup.add(handle);

            const tableGeo = new THREE.BoxGeometry(0.55, 0.03, 3.4);
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
            const tabletop = new THREE.Mesh(tableGeo, tableMat);
            tabletop.position.set(0, 0.015, -0.2);
            tabletop.castShadow = true; tabletop.receiveShadow = true;
            tabletopGroup.add(tabletop);

            const matGeo = new THREE.BoxGeometry(0.53, 0.025, 3.3);
            const matMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
            const mattress = new THREE.Mesh(matGeo, matMat);
            mattress.position.set(0, 0.04, -0.2);
            tabletopGroup.add(mattress);

            const patientGroup = new THREE.Group();
            patientGroup.position.set(0, 0.08, -0.2);
            tabletopGroup.add(patientGroup);
            Meshes.patientGroup = patientGroup;

            const loader = new THREE.GLTFLoader();
            loader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Xbot.glb', function (gltf) {
                const model = gltf.scene;

                model.rotation.x = -Math.PI / 2;
                model.scale.set(0.85, 0.85, 0.85);
                model.position.set(0, 0, 0.1);

                model.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.frustumCulled = false;
                    }
                });

                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    const idleAnim = gltf.animations.find(a => a.name === 'idle') || gltf.animations[0];
                    if (idleAnim) {
                        const action = mixer.clipAction(idleAnim);
                        action.play();
                    }
                }

                patientGroup.add(model);
                patientGroup.visible = AppState.patientVisible;
            });

            couchGroup.add(tabletopGroup);
            Meshes.tabletopGroup = tabletopGroup;

            ctGroup.add(couchGroup);
            scene.add(ctGroup);
        }

        function buildInjector() {
            const injectorGroup = new THREE.Group();
            injectorGroup.position.set(-1.8, 0, 1.8);

            const standMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.3 });

            const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), standMat);
            standBase.position.y = 0.05;
            injectorGroup.add(standBase);

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 16), standMat);
            pole.position.y = 0.7;
            injectorGroup.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), standMat);
            arm.position.set(0.15, 1.3, 0);
            injectorGroup.add(arm);

            const headGroup = new THREE.Group();
            headGroup.position.set(0.3, 1.3, 0);
            headGroup.rotation.z = -Math.PI / 6;
            headGroup.rotation.y = Math.PI / 4;

            const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
            headGroup.add(headBox);

            function createSyringe(offsetX, isContrast) {
                const syringeGroup = new THREE.Group();
                syringeGroup.position.set(offsetX, 0.2, 0);

                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.1, transmission: 0.8 }));
                syringeGroup.add(barrel);

                const fluidGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.3, 16);
                fluidGeo.translate(0, 0.15, 0);
                const fluidMat = new THREE.MeshStandardMaterial({ color: isContrast ? 0xccffcc : 0xddddff, transparent: true, opacity: 0.8 });
                const fluid = new THREE.Mesh(fluidGeo, fluidMat);
                fluid.position.y = -0.15;
                syringeGroup.add(fluid);

                const plungerGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.05, 16);
                const plungerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
                const plunger = new THREE.Mesh(plungerGeo, plungerMat);
                plunger.position.y = 0.15;

                const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8), plungerMat);
                rod.position.y = 0.15;
                plunger.add(rod);

                syringeGroup.add(plunger);
                return { group: syringeGroup, fluid, plunger };
            }

            const syringeA = createSyringe(-0.08, true);
            const syringeB = createSyringe(0.08, false);
            headGroup.add(syringeA.group); headGroup.add(syringeB.group);

            Meshes.injector = {
                fluidA: syringeA.fluid, plungerA: syringeA.plunger,
                fluidB: syringeB.fluid, plungerB: syringeB.plunger
            };

            injectorGroup.add(headGroup);
            scene.add(injectorGroup);
        }

        function buildControlRoom() {
            const controlGroup = new THREE.Group();
            
            controlGroup.position.set(6.0, 0, 0);

            const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 2.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
            deskTop.position.set(0, 0.75, 0);
            deskTop.castShadow = true; deskTop.receiveShadow = true;

            const legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
            const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
            const leg1 = new THREE.Mesh(legGeo, legMat); leg1.position.set(0, -0.375, 0.9);
            const leg2 = new THREE.Mesh(legGeo, legMat); leg2.position.set(0, -0.375, -0.9);
            deskTop.add(leg1); deskTop.add(leg2);
            controlGroup.add(deskTop);

            function createConsoleMonitor(zOffset) {
                const monitorGroup = new THREE.Group();
                monitorGroup.position.set(0.1, 0.8, zOffset);
                monitorGroup.rotation.y = -Math.PI / 2 + (zOffset > 0 ? -0.1 : 0.1);

                const stand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111 }));
                stand.position.y = 0.1;
                monitorGroup.add(stand);

                const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x222 }));
                panel.position.set(0, 0.35, 0.05);

                const screenGroup = new THREE.Group();
                screenGroup.position.set(0, 0, 0.026);

                const screenBG = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.41), new THREE.MeshBasicMaterial({ color: 0x112233 }));
                screenGroup.add(screenBG);

                const imgBox = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x8899aa }));
                imgBox.position.set(0.15, 0, 0.001);
                screenGroup.add(imgBox);

                panel.add(screenGroup);
                monitorGroup.add(panel);
                return monitorGroup;
            }

            controlGroup.add(createConsoleMonitor(-0.4));
            controlGroup.add(createConsoleMonitor(0.4));

            const kbMat = new THREE.MeshStandardMaterial({ color: 0x222 });
            const kb1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat); kb1.position.set(-0.2, 0.775, -0.4); controlGroup.add(kb1);
            const kb2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.4), kbMat); kb2.position.set(-0.2, 0.775, 0.4); controlGroup.add(kb2);

            const switcherGroup = new THREE.Group();
            switcherGroup.position.set(0.0, 0.78, 0.0);
            switcherGroup.rotation.y = -Math.PI / 16;
            switcherGroup.rotation.z = Math.PI / 16; 

            const swBaseMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
            const swBaseGeo = new THREE.BoxGeometry(0.36, 0.04, 0.10); 
            const swBase = new THREE.Mesh(swBaseGeo, swBaseMat);
            switcherGroup.add(swBase);

            const btnColors = [0x22cc22, 0xcc2222, 0xddcc22, 0x2288dd, 0xcccccc, 0xcccccc];
            
            for (let i = 0; i < 6; i++) {
                const isStartBtn = (i === 0);
                const rBot = isStartBtn ? 0.022 : 0.015;
                const h = isStartBtn ? 0.025 : 0.015;
                
                const btnMat = new THREE.MeshStandardMaterial({ color: btnColors[i], roughness: 0.5 });
                const btnGeo = new THREE.CylinderGeometry(rTop, rBot, h, 24);
                const btn = new THREE.Mesh(btnGeo, btnMat);
                
                const xOffset = -0.14 + i * 0.055; 
                btn.position.set(xOffset, 0.02 + h / 2 - 0.005, 0); 
                switcherGroup.add(btn);
            }
            controlGroup.add(switcherGroup);

            scene.add(controlGroup);
        }

        function buildServerRack() {
            const rackGroup = new THREE.Group();
            
            const rackX = 6.0;
            const rackZ = -2.2;
            rackGroup.position.set(rackX, 0, rackZ);

            const rackWidth = 0.6;
            const rackHeight = 1.6;
            const rackDepth = 0.8;

            const frameMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.2, roughness: 0.8 });
            const frameGeo = new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth);
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.y = rackHeight / 2;
            frame.castShadow = true; frame.receiveShadow = true;
            rackGroup.add(frame);

            const innerMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
            const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(rackWidth - 0.04, rackHeight - 0.1, rackDepth + 0.01), innerMat);
            innerPanel.position.y = rackHeight / 2;
            rackGroup.add(innerPanel);

            Meshes.serverBlades = {};
            Meshes.serverLeds = [];

            const serverNames = ['SCON', 'DCON', 'RTM', 'IDD', 'RDD', 'SAC'];
            const bladeCount = serverNames.length;
            const bladeHeight = 0.2;
            const bladeMargin = 0.04;
            const startY = 0.1; 

            for(let i=0; i<bladeCount; i++) {
                const label = serverNames[i];
                const bladeGroup = new THREE.Group();
                const yPos = startY + i * (bladeHeight + bladeMargin) + bladeHeight/2;
                
                bladeGroup.position.set(0, yPos, rackDepth / 2 + 0.006);

                const bladeGeo = new THREE.BoxGeometry(rackWidth - 0.06, bladeHeight, 0.02);
                const bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                bladeGroup.add(blade);

                const ventGeo = new THREE.PlaneGeometry(0.3, 0.1);
                const ventMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
                const vent = new THREE.Mesh(ventGeo, ventMat);
                vent.position.set(0, 0, 0.011);
                bladeGroup.add(vent);

                // 陷ｿ蛹∫・ (陝ｾ・ｦ陷ｿ・ｳ)
                const handleGeo = new THREE.BoxGeometry(0.015, bladeHeight - 0.04, 0.04);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
                const handleL = new THREE.Mesh(handleGeo, handleMat);
                handleL.position.set(-rackWidth/2 + 0.06, 0, 0.02);
                const handleR = handleL.clone();
                handleR.position.set(rackWidth/2 - 0.06, 0, 0.02);
                bladeGroup.add(handleL); bladeGroup.add(handleR);

                const lblMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
                const lbl = new THREE.Mesh(lblGeo, lblMat);
                lbl.position.set(-rackWidth/2 + 0.14, 0, 0.012);
                bladeGroup.add(lbl);

                const ledGeo = new THREE.CircleGeometry(0.008, 16);
                const pwrLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                const pwrLed = new THREE.Mesh(ledGeo, pwrLedMat);
                pwrLed.position.set(-rackWidth/2 + 0.20, 0.02, 0.012);
                bladeGroup.add(pwrLed);

                for(let j=0; j<3; j++) {
                    const actLedMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true });
                    const actLed = new THREE.Mesh(ledGeo, actLedMat);
                    actLed.position.set(-rackWidth/2 + 0.24 + (j * 0.03), 0.02, 0.012);
                    bladeGroup.add(actLed);
                    Meshes.serverLeds.push(actLedMat); 
                }

                rackGroup.add(bladeGroup);

                Meshes.serverBlades[label] = {
                    target: new THREE.Vector3(rackX, yPos, rackZ + rackDepth/2),
                    cameraPos: new THREE.Vector3(rackX - 1.0, yPos + 0.1, rackZ + rackDepth/2 + 1.2)
                };
            }

            Meshes.serverBlades['FullRack'] = {
                target: new THREE.Vector3(rackX, rackHeight/2, rackZ),
                cameraPos: new THREE.Vector3(rackX - 2.5, rackHeight/2 + 0.2, rackZ + 2.0)
            };

            scene.add(rackGroup);
        }

        function setupUI() {
            UI.sliderCouchY = document.getElementById('slider-couch-y');
            UI.sliderCouchZ = document.getElementById('slider-couch-z');
            UI.sliderRotorSpeed = document.getElementById('slider-rotor-speed');
            UI.sliderInjectA = document.getElementById('slider-inject-a');
            UI.sliderInjectB = document.getElementById('slider-inject-b');
            UI.btnScanToggle = document.getElementById('btn-scan-toggle');
            UI.btnXrayToggle = document.getElementById('btn-xray-toggle');
            UI.selectDetectorRows = document.getElementById('select-detector-rows');
            UI.btnPatientToggle = document.getElementById('btn-patient-toggle');

            UI.sliderCouchY.addEventListener('input', e => AppState.update('couch', 'y', parseFloat(e.target.value)));
            UI.sliderCouchZ.addEventListener('input', e => AppState.update('couch', 'z', parseFloat(e.target.value)));
            UI.sliderInjectA.addEventListener('input', e => AppState.update('injector', 'a', parseFloat(e.target.value)));
            UI.sliderInjectB.addEventListener('input', e => AppState.update('injector', 'b', parseFloat(e.target.value)));
            UI.selectDetectorRows.addEventListener('change', e => AppState.update('gantry', 'detectorRows', parseInt(e.target.value)));

            // 陋ｻ譎丞ｱ楢ｬ蜀怜愛
            renderBatchUI();

            AppState.subscribe(state => {
                document.getElementById('couch-y-val').innerText = state.couch.y.toFixed(0) + '%';
                document.getElementById('couch-z-val').innerText = state.couch.z.toFixed(0) + '%';
                document.getElementById('rotor-speed-val').innerText = state.gantry.rotorSpeed.toFixed(0) + ' rpm';
                document.getElementById('inject-a-val').innerText = state.injector.a.toFixed(0) + '%';
                document.getElementById('inject-b-val').innerText = state.injector.b.toFixed(0) + '%';

                UI.sliderCouchY.value = state.couch.y;
                UI.sliderCouchZ.value = state.couch.z;
                UI.sliderRotorSpeed.value = state.gantry.rotorSpeed;
                UI.sliderInjectA.value = state.injector.a;
                UI.sliderInjectB.value = state.injector.b;
                UI.selectDetectorRows.value = state.gantry.detectorRows;

                if (state.gantry.isScanning) {
                    UI.btnScanToggle.innerText = "Stop Scan";
                    UI.btnScanToggle.classList.replace('bg-green-600', 'bg-red-600');
                    UI.btnScanToggle.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
                } else {
                    UI.btnScanToggle.innerText = "Start Scan";
                    UI.btnScanToggle.classList.replace('bg-red-600', 'bg-green-600');
                    UI.btnScanToggle.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
                }

                if (state.gantry.xrayVisible) {
                    UI.btnXrayToggle.innerText = "Hide X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-yellow-500 hover:bg-yellow-400 text-xs py-1.5 rounded transition font-bold text-black";
                } else {
                    UI.btnXrayToggle.innerText = "Show X-Ray Beam";
                    UI.btnXrayToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
                }

                if (Meshes.xrayBeam) {
                    Meshes.xrayBeam.material.opacity = state.gantry.xrayVisible ? 0.35 : 0.0;
                }

                if (Meshes.patientGroup) {
                    Meshes.patientGroup.visible = state.patientVisible;
                }
                if (state.patientVisible) {
                    UI.btnPatientToggle.innerText = "Hide Patient";
                    UI.btnPatientToggle.className = "w-full bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                } else {
                    UI.btnPatientToggle.innerText = "Show Patient";
                    UI.btnPatientToggle.className = "w-full bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition text-gray-400";
                }

                applyStateToMeshes(state);
            });
        }

        function applyStateToMeshes(state) {
            const couchY_min = 0.45;
            const couchY_max = 0.95;
            const targetY = couchY_min + (couchY_max - couchY_min) * (state.couch.y / 100);

            if (Meshes.tabletopGroup) Meshes.tabletopGroup.position.y = targetY;

            if (Meshes.bellows) {
                const baseTop = 0.2;
                const totalBellowsHeight = targetY - baseTop - 0.02;
                const partHeight = totalBellowsHeight / Meshes.bellows.length;

                Meshes.bellows.forEach((mesh, index) => {
                    mesh.scale.y = partHeight / 0.1;
                    mesh.position.y = (index * partHeight) + (partHeight / 2);
                });
            }

            const couchZ_min = 2.6;
            const couchZ_max = -1.0;
            if (Meshes.tabletopGroup) {
                Meshes.tabletopGroup.position.z = couchZ_min + (couchZ_max - couchZ_min) * (state.couch.z / 100);
            }

            if (Meshes.detectorGroup && Meshes.xrayBeam) {
                const ratio = state.gantry.detectorRows / 320.0;
                Meshes.detectorGroup.scale.z = ratio;
                const baseBeamZScale = 0.16;
                Meshes.xrayBeam.scale.z = baseBeamZScale * ratio;
            }

            function updateSyringe(fluidMesh, plungerMesh, percent) {
                const ratio = Math.max(0.01, 1.0 - (percent / 100));
                if (fluidMesh) fluidMesh.scale.y = ratio;
                if (plungerMesh) plungerMesh.position.y = 0.15 - (0.3 * (percent / 100));
            }

            if (Meshes.injector) {
                updateSyringe(Meshes.injector.fluidA, Meshes.injector.plungerA, state.injector.a);
                updateSyringe(Meshes.injector.fluidB, Meshes.injector.plungerB, state.injector.b);
            }
        }

        function updateStateMonitor() {
            // Gantry
            const rpm = Math.round(AppState.gantry.rotorSpeed);
            document.getElementById('monitor-rpm').innerText = rpm + ' rpm';
            document.getElementById('monitor-rpm-bar').style.width = (rpm / 100 * 100) + '%';
            document.getElementById('monitor-mode').innerText = AppState.gantry.currentScanMode.replace(/_/g, ' ').toUpperCase();
            document.getElementById('monitor-rows').innerText = AppState.gantry.detectorRows;

            // Badge Status
            const badge = document.getElementById('status-badge');
            if (AppState.gantry.isScanning) {
                badge.innerText = 'SCANNING';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse';
            } else if (rpm > 0) {
                badge.innerText = 'SPINNING';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
            } else {
                badge.innerText = 'STANDBY';
                badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-300';
            }

            // Couch
            document.getElementById('monitor-couch-y').innerText = Math.round(AppState.couch.y) + '%';
            document.getElementById('monitor-couch-z').innerText = Math.round(AppState.couch.z) + '%';

            // Injector
            const injA = Math.round(AppState.injector.a);
            const injB = Math.round(AppState.injector.b);
            const remainA = 100 - injA;
            const remainB = 100 - injB;

            document.getElementById('monitor-inj-a').innerText = remainA + '%';
            document.getElementById('monitor-inj-b').innerText = remainB + '%';
            document.getElementById('monitor-inj-a-bar').style.width = remainA + '%';
            document.getElementById('monitor-inj-b-bar').style.width = remainB + '%';
        }

        function renderBatchUI() {
            const container = document.getElementById('batch-container');
            const seq = AppState.gantry.scanSequence;
            const activeIdx = AppState.gantry.activeBatchIndex;
            const syncIdx = AppState.gantry.injectorSyncIndex;
            const countdown = AppState.gantry.countdown;
            
            container.innerHTML = '';
            
            seq.forEach((batch, index) => {
                const isActive = index === activeIdx;
                const isRunning = AppState.gantry.isScanning || activeIdx >= 0;
                const mode = batch.mode;
                const delay = batch.delay;
                const isSyncTarget = index === syncIdx;

                const card = document.createElement('div');
                let cardClasses = `relative rounded-lg p-2.5 w-36 flex flex-col items-center transition-all duration-300 `;
                if (isActive) {
                    cardClasses += `bg-blue-900/80 border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-110 z-10`;
                } else {
                    cardClasses += `bg-gray-800 border border-gray-600`;
                }
                card.className = cardClasses;

                if (isActive && countdown > 0) {
                    const overlay = document.createElement('div');
                    overlay.className = 'absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-20 backdrop-blur-[2px]';
                    overlay.innerHTML = `<span class="text-[10px] text-yellow-400 font-bold mb-1 tracking-widest">DELAY</span><span class="text-4xl font-mono text-white font-bold leading-none">${countdown}</span>`;
                    card.appendChild(overlay);
                }
                
                const header = document.createElement('div');
                header.className = 'text-[10px] text-gray-400 mb-1.5 w-full flex justify-between items-center';
                
                const label = document.createElement('span');
                label.innerText = `Batch ${index + 1}`;
                if (isActive) label.className = 'text-yellow-400 font-bold';
                
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '&times;';
                delBtn.className = 'hover:text-red-400 text-base leading-none transition-colors';
                delBtn.disabled = isRunning || seq.length <= 1; 
                if (delBtn.disabled) delBtn.className += ' opacity-30 cursor-not-allowed';
                delBtn.onclick = () => removeScanBatch(index);
                
                header.appendChild(label);
                header.appendChild(delBtn);
                
                const select = document.createElement('select');
                select.className = 'w-full bg-gray-900 text-white text-[11px] p-1.5 rounded border border-gray-700 outline-none hover:border-blue-500 transition-colors cursor-pointer';
                select.disabled = isRunning;
                if (select.disabled) select.className += ' opacity-70 cursor-not-allowed';
                select.onchange = (e) => updateBatchData(index, 'mode', e.target.value);
                
                const options = [
                    {val: 'scano', text: 'Scano'},
                    {val: 'dual_scano', text: 'Dual Scano'},
                    {val: '3d_landmark', text: '3D Landmark'},
                    {val: 'helical', text: 'Helical'},
                    {val: 'axial', text: 'Axial'},
                    {val: 'volume', text: 'Volume'},
                    {val: 'dynamic', text: 'Dynamic'},
                    {val: 'real_prep', text: 'Real Prep'}
                ];
                
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.val;
                    option.innerText = opt.text;
                    if (opt.val === mode) option.selected = true;
                    select.appendChild(option);
                });
                
                // Delay陷茨ｽ･陷峨・
                const delayWrapper = document.createElement('div');
                delayWrapper.className = 'w-full flex items-center justify-between mt-2 text-[10px] text-gray-400';
                delayWrapper.innerHTML = '<span>Delay (s)</span>';
                
                const delayInput = document.createElement('input');
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.max = '60';
                delayInput.value = delay;
                delayInput.className = 'w-10 bg-gray-900 text-white p-1 rounded border border-gray-700 outline-none text-center';
                delayInput.disabled = isRunning;
                delayInput.onchange = (e) => updateBatchData(index, 'delay', parseInt(e.target.value) || 0);
                
                delayWrapper.appendChild(delayInput);

                const syncBtn = document.createElement('button');
                syncBtn.innerText = isSyncTarget ? 'INJ SYNC: ON' : 'INJ SYNC: OFF';
                syncBtn.className = `w-full mt-2 py-1 rounded text-[9px] font-bold transition-colors ${isSyncTarget ? 'bg-purple-600/80 text-white border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-gray-900 text-gray-500 border border-gray-700 hover:bg-gray-700'}`;
                syncBtn.disabled = isRunning;
                if (syncBtn.disabled) {
                    syncBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    syncBtn.classList.remove('hover:bg-gray-700');
                }
                syncBtn.onclick = () => setInjectorSync(index);

                card.appendChild(header);
                card.appendChild(select);
                card.appendChild(delayWrapper);
                card.appendChild(syncBtn);
                
                if (index < seq.length - 1) {
                    const arrowWrap = document.createElement('div');
                    arrowWrap.className = 'flex items-center justify-center text-gray-500';
                    arrowWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>';
                    container.appendChild(card);
                    container.appendChild(arrowWrap);
                } else {
                    container.appendChild(card);
                }
            });

            const isRunning = AppState.gantry.isScanning || activeIdx >= 0;

            const addBtn = document.getElementById('btn-add-batch');
            addBtn.disabled = seq.length >= 5 || isRunning;
            if(addBtn.disabled) {
                addBtn.classList.add('opacity-30', 'cursor-not-allowed');
                addBtn.classList.remove('hover:bg-gray-700', 'hover:text-white');
            } else {
                addBtn.classList.remove('opacity-30', 'cursor-not-allowed');
                addBtn.classList.add('hover:bg-gray-700', 'hover:text-white');
            }
            
            const runBtn = document.getElementById('btn-run-sequence');
            if (isRunning) {
                runBtn.disabled = false;
                runBtn.onclick = stopAutoSequence; 
                if (AppState.gantry.cancelRequested) {
                    runBtn.className = 'h-16 px-6 bg-gray-700 text-gray-400 text-xs font-bold rounded-lg border border-gray-600 flex items-center gap-2 transition-all cursor-not-allowed';
                    runBtn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-t-red-400 animate-spin"></div> <span class="tracking-widest">STOPPING...</span>';
                    runBtn.disabled = true;
                } else if (countdown > 0) {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-t-yellow-400 animate-spin"></div> <span class="tracking-widest">DELAY ${countdown}s (STOP)</span>`;
                } else {
                    runBtn.className = 'h-16 px-6 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 tracking-wider';
                    runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg> STOP SEQUENCE';
                }
            } else {
                runBtn.disabled = false;
                runBtn.onclick = runAutoSequence;
                runBtn.className = 'h-16 px-6 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 tracking-wider';
                runBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg> RUN SEQUENCE';
            }
        }

        function setInjectorSync(index) {
            const current = AppState.gantry.injectorSyncIndex;
            AppState.update('gantry', 'injectorSyncIndex', current === index ? -1 : index);
        }

        function addScanBatch() {
            if (AppState.gantry.scanSequence.length >= 5) return;
            const newSeq = [...AppState.gantry.scanSequence, {mode: 'helical', delay: 0}];
            AppState.update('gantry', 'scanSequence', newSeq);
        }

        function removeScanBatch(index) {
            if (AppState.gantry.scanSequence.length <= 1) return;
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq.splice(index, 1);
            AppState.update('gantry', 'scanSequence', newSeq);
        }

        function updateBatchData(index, key, value) {
            const newSeq = [...AppState.gantry.scanSequence];
            newSeq[index] = { ...newSeq[index], [key]: value };
            AppState.update('gantry', 'scanSequence', newSeq);
            
            if (key === 'mode') {
                showInfoDialog(value);
                if (index === 0) {
                    AppState.update('gantry', 'currentScanMode', value);
                }
            }
        }

        function showInfoDialog(key) {
            if (!key || key === 'none') return;

            const dialog = document.getElementById('info-dialog');
            const titleElem = document.getElementById('info-dialog-title');
            const descElem = document.getElementById('info-dialog-desc');

            const text = Descriptions[key] || 'Description not found.';
            const lines = text.split('\n\n');
            
            titleElem.innerText = lines[0]; 
            descElem.innerText = lines[1] || ''; 

            dialog.classList.remove('hidden');
            dialog.classList.remove('opacity-0');
        }

        function hideInfoDialog() {
            const dialog = document.getElementById('info-dialog');
            dialog.classList.add('hidden');
            document.getElementById('select-focus').value = "";
        }

        function handleFocusChange(value) {
            if (!value) return;

            if (value === 'XrayTube' || value === 'Detector') {
                setGantryOpacity(true);
            } else if (value === 'Gantry' || value === 'TouchPanel') {
                setGantryOpacity(false); 
            }

            setCameraView('focus_' + value);
            showInfoDialog(value);
        }

        function toggleScan() {
            const isScan = !AppState.gantry.isScanning;
            AppState.update('gantry', 'isScanning', isScan);

            new TWEEN.Tween(AppState.gantry)
                .to({ rotorSpeed: isScan ? 100 : 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => AppState.notify())
                .start();
        }

        function setScanMode(mode) {
            AppState.update('gantry', 'scanMode', mode);
        }

        function setCameraView(viewType) {
            if (!viewType.startsWith('focus_')) {
                hideInfoDialog();
            }

            new TWEEN.Tween(camera.position)
                .to(getCameraTarget(viewType).pos, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();

            new TWEEN.Tween(controls.target)
                .to(getCameraTarget(viewType).lookAt, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }

        function getCameraTarget(type) {
            if (type.startsWith('focus_')) {
                const label = type.replace('focus_', '');
                
                if (Meshes.serverBlades && Meshes.serverBlades[label]) {
                    return { pos: Meshes.serverBlades[label].cameraPos, lookAt: Meshes.serverBlades[label].target };
                }
                
                const focusTargets = {
                    'Injector': { cameraPos: new THREE.Vector3(-2.8, 1.6, 2.8), target: new THREE.Vector3(-1.5, 1.3, 1.8) },
                    'Gantry': { cameraPos: new THREE.Vector3(0, 2.0, 4.0), target: new THREE.Vector3(0, 1.2, 0) },
                    'Couch': { cameraPos: new THREE.Vector3(2.5, 1.8, 3.5), target: new THREE.Vector3(0, 0.8, 2.0) },
                    'TouchPanel': { cameraPos: new THREE.Vector3(1.2, 1.6, 1.0), target: new THREE.Vector3(0.8, 1.55, 0.4) },
                    'XrayTube': { cameraPos: new THREE.Vector3(0, 2.0, 1.2), target: new THREE.Vector3(0, 1.72, 0) },
                    'Detector': { cameraPos: new THREE.Vector3(0, 0.5, 1.5), target: new THREE.Vector3(0, 0.68, 0) },
                    'ConsoleDisplay': { cameraPos: new THREE.Vector3(5.0, 1.6, 0.5), target: new THREE.Vector3(6.1, 1.4, -0.2) },
                    'OperationSwitcher': { cameraPos: new THREE.Vector3(5.2, 1.1, 0.2), target: new THREE.Vector3(6.0, 0.78, 0.0) }
                };

                if (focusTargets[label]) {
                    return { pos: focusTargets[label].cameraPos, lookAt: focusTargets[label].target };
                }
            }

            switch (type) {
                case 'operator':
                    return { pos: new THREE.Vector3(7.0, 1.5, 0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'patient':
                    return { pos: new THREE.Vector3(0, 1.3, 4.0), lookAt: new THREE.Vector3(0, 1.2, 0) };
                case 'injector':
                    return { pos: new THREE.Vector3(-3.0, 1.6, 2.5), lookAt: new THREE.Vector3(-1.8, 1.3, 1.8) };
                case 'gantryTop':
                    return { pos: new THREE.Vector3(0, 2.02, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'gantrySide':
                    return { pos: new THREE.Vector3(-0.82, 1.2, 0.45), lookAt: new THREE.Vector3(0, 1.0, 1.5) };
                case 'free':
                default:
                    return { pos: new THREE.Vector3(4, 3, 5), lookAt: new THREE.Vector3(0, 0.5, 0) };
            }
        }

        function togglePatient() {
            AppState.update('root', 'patientVisible', !AppState.patientVisible);
            AppState.patientVisible = !AppState.patientVisible;
            AppState.notify();
        }

        function toggleXRay() {
            const isVisible = !AppState.gantry.xrayVisible;
            AppState.update('gantry', 'xrayVisible', isVisible);

            if (isVisible) setGantryOpacity(true);
        }

        function setGantryOpacity(isTranslucent) {
            if (Meshes.materials) {
                const opacity = isTranslucent ? 0.2 : 1.0;

                Meshes.materials.gantry.transparent = isTranslucent;
                Meshes.materials.gantry.opacity = opacity;
                Meshes.materials.gantry.depthWrite = !isTranslucent;
                Meshes.materials.gantry.needsUpdate = true;

                Meshes.materials.base.transparent = isTranslucent;
                Meshes.materials.base.opacity = opacity;
                Meshes.materials.base.depthWrite = !isTranslucent;
                Meshes.materials.base.needsUpdate = true;

                Meshes.materials.tunnel.transparent = isTranslucent;
                Meshes.materials.tunnel.opacity = isTranslucent ? 0.35 : 1.0;
                Meshes.materials.tunnel.transmission = isTranslucent ? 0.9 : 0.0;
                Meshes.materials.tunnel.depthWrite = !isTranslucent;
                Meshes.materials.tunnel.needsUpdate = true;

                Meshes.materials.accessories.forEach(mat => {
                    mat.transparent = isTranslucent;
                    mat.opacity = opacity;
                    mat.depthWrite = !isTranslucent;
                    mat.needsUpdate = true;
                });
            }

            const btnOpq = document.getElementById('btn-gantry-opaque');
            const btnTrn = document.getElementById('btn-gantry-trans');

            if (isTranslucent) {
                btnTrn.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnOpq.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            } else {
                btnOpq.className = "flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded border border-blue-500 transition font-bold";
                btnTrn.className = "flex-1 bg-gray-800 hover:bg-gray-700 text-xs py-1.5 rounded border border-gray-600 transition";
            }
        }

        function wait(ms) {
            return new Promise(resolve => {
                const interval = 100;
                let elapsed = 0;
                const timer = setInterval(() => {
                    elapsed += interval;
                    if (AppState.gantry.cancelRequested || elapsed >= ms) {
                        clearInterval(timer);
                        resolve();
                    }
                }, interval);
            });
        }

        function tweenPromise(target, to, duration, easing = TWEEN.Easing.Quadratic.InOut) {
            return new Promise(resolve => {
                const tween = new TWEEN.Tween(target)
                    .to(to, duration)
                    .easing(easing)
                    .onUpdate(() => {
                        AppState.notify();
                        if (AppState.gantry.cancelRequested) {
                            tween.stop();
                            resolve(); 
                        }
                    })
                    .onComplete(resolve)
                    .start();
            });
        }

        let isSequenceRunning = false;

        function stopAutoSequence() {
            if (!isSequenceRunning) return;
            AppState.update('gantry', 'cancelRequested', true);
        }

        async function runAutoSequence() {
            if (isSequenceRunning) return;
            isSequenceRunning = true;
            AppState.update('gantry', 'cancelRequested', false);

            AppState.update('couch', 'y', 0);
            AppState.update('couch', 'z', 0);
            AppState.update('injector', 'a', 0);
            if (AppState.gantry.xrayVisible) toggleXRay();
            if (AppState.gantry.isScanning) toggleScan();

            // 1. 陝・剌蠎顔ｸｺ・ｮ闕ｳ鬆代・
            await tweenPromise(AppState.couch, { y: 80 }, 2000);

            const seq = AppState.gantry.scanSequence;

            for (let i = 0; i < seq.length; i++) {
                if (AppState.gantry.cancelRequested) break;

                const batch = seq[i];
                const mode = batch.mode;
                const delay = batch.delay || 0;
                const isSyncTarget = (AppState.gantry.injectorSyncIndex === i);
                
                AppState.update('gantry', 'activeBatchIndex', i);
                AppState.update('gantry', 'currentScanMode', mode);

                if (delay > 0) {
                    for(let d = delay; d > 0; d--) {
                        if (AppState.gantry.cancelRequested) break;
                        AppState.update('gantry', 'countdown', d);
                        await wait(1000);
                    }
                    AppState.update('gantry', 'countdown', 0);
                }

                if (AppState.gantry.cancelRequested) break;

                if (isSyncTarget) {
                    tweenPromise(AppState.injector, { a: 100 }, 4000);
                }

                const isScano = mode === 'scano' || mode === 'dual_scano';
                const isVolume = mode === 'volume' || mode === 'dynamic' || mode === 'real_prep';
                const isHelicalLike = mode === 'helical' || mode === '3d_landmark';

                if (isScano) {
                    new TWEEN.Tween(Meshes.rotor.rotation).to({ z: 0 }, 1000).start();
                    await wait(1000);
                    if (AppState.gantry.cancelRequested) break;
                    
                    await tweenPromise(AppState.couch, { z: 80 }, 1500); 
                    if (AppState.gantry.cancelRequested) break;

                    toggleXRay();
                    await tweenPromise(AppState.couch, { z: 20 }, 4000, TWEEN.Easing.Linear.None);
                    if (AppState.gantry.xrayVisible) toggleXRay();

                } else {
                    if (!AppState.gantry.isScanning) {
                        toggleScan();
                        await wait(2000);
                    }
                    if (AppState.gantry.cancelRequested) break;

                    if (isHelicalLike) {
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await tweenPromise(AppState.couch, { z: 20 }, 5000, TWEEN.Easing.Linear.None);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (isVolume) {
                        await tweenPromise(AppState.couch, { z: 70 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        toggleXRay();
                        await wait(4000);
                        if (AppState.gantry.xrayVisible) toggleXRay();

                    } else if (mode === 'axial') {
                        await tweenPromise(AppState.couch, { z: 80 }, 1500);
                        if (AppState.gantry.cancelRequested) break;

                        const steps = 4;
                        const startZ = 80;
                        const endZ = 20;
                        const stepDist = (startZ - endZ) / steps;

                        for (let step = 0; step < steps; step++) {
                            if (AppState.gantry.cancelRequested) break;
                            toggleXRay();
                            await wait(1000); 
                            if (AppState.gantry.xrayVisible) toggleXRay();

                            if (step < steps - 1 && !AppState.gantry.cancelRequested) {
                                const nextZ = startZ - (stepDist * (step + 1));
                                await tweenPromise(AppState.couch, { z: nextZ }, 800, TWEEN.Easing.Quadratic.InOut);
                                await wait(200);
                            }
                        }
                    }
                }
                
                await wait(1000);
            }

            
                toggleXRay();
            }

            AppState.update('gantry', 'activeBatchIndex', -1);
            AppState.update('gantry', 'countdown', 0);

            if (AppState.gantry.isScanning) {
                toggleScan();
                await wait(2000);
            }

            // 陝・剌蠎企ｨｾﾂ陷・ｽｺ
            await tweenPromise(AppState.couch, { z: 0 }, 2000);
            await tweenPromise(AppState.couch, { y: 0 }, 2000);

            // 霑･・ｶ隲ｷ荵昴・陟包ｽｩ陷医・
            AppState.update('gantry', 'currentScanMode', AppState.gantry.scanSequence[0].mode);
            AppState.update('gantry', 'cancelRequested', false);

            isSequenceRunning = false;
            renderBatchUI(); 
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate(time) {
            requestAnimationFrame(animate);
            TWEEN.update(time);
            const delta = clock.getDelta();

            if (Meshes.rotor && AppState.gantry.rotorSpeed > 0) {
                const radPerSec = (AppState.gantry.rotorSpeed * Math.PI * 2) / 60;
                Meshes.rotor.rotation.z += radPerSec * delta;
                AppState.gantry.angle = Meshes.rotor.rotation.z % (Math.PI * 2);
            }

            if (mixer) {
                mixer.update(delta);
            }

            if (Meshes.serverLeds) {
                Meshes.serverLeds.forEach(mat => {
                    if (Math.random() > 0.85) {
                        mat.opacity = Math.random();
                    }
                });
            }

            controls.update();
            renderer.render(scene, camera);
        }
