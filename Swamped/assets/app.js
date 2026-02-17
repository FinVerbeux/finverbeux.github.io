    // ================================================
    // GAME STATE
    // ================================================
    const GameState = {
        data: 0n, bandwidth: 0n, totalPackets: 0n,
        startTime: Date.now(), lastSave: Date.now(), lastTick: Date.now(),
        buildings: {}, upgrades: {}, consumables: {},
        temperature: {
            current: 18, target: 18, maxSafe: 25, productionPenalty: 0,
            qteActive: false, qteStartTime: 0, qteTimeout: 15000, qteCooldown: 0,
            qteCommands: ['cooling', 'ventilate', 'fan_ctrl', 'hvac_reset', 'temp_adjust'],
            expectedCommand: ''
        },
        skills: {
            dnsAmplification: { level: 0, maxLevel: 5, active: false, cooldown: 0, baseCooldown: 90000, duration: 10000, multiplier: 50 },
            broadcastStorm: { level: 0, maxLevel: 5, active: false, instability: 0, crashed: false, crashTime: 0, crashDuration: 30000, multiplier: 10 },
            packetInjection: { level: 0, maxLevel: 3, active: false, cooldown: 0, baseCooldown: 70000, duration: 15000, clickMultiplier: 5 }
        },
        systemMalfunction: { active: false, severity: 0, startTime: 0, nextMalfunctionCheck: Date.now() + 300000 },
        uiTheme: 'default', miningMode: 'data', crypto: 0, processorCores: 0n,
        blackMarket: {},
        rivalAttack: { active: false, endTime: 0, expectedCommand: 'firewall', nextAttackCheck: Date.now() + 120000 },
        contract: {
            active: null,
            pool: [],
            stats: { crashes: 0n, blackouts: 0n, completed: 0n }
        },
        story: { unlocked: ['boot_sequence'], active: 'boot_sequence' },
        energy: { currentWatts: 0, capacityWatts: 2500, blackout: false, blackoutEnd: 0, baseCapacity: 2500, hackedGridBonus: 0, backupGenerator: false },
        factions: { ghostwire: { reputation: 0 }, blackflag: { reputation: 0 }, overclock: { reputation: 0 } },
        talents: { redPhishing: 0, redPayload: 0, blueShield: 0, blueCooling: 0, hardwareEfficiency: 0, hardwarePower: 0 },
        packetsFromAutomation: 0n, boosterCooldownUntil: 0,
        files: [],
        solarStorm: { active: false, endTime: 0, nextCheck: Date.now() + 150000, impactMode: 'production', productionMultiplier: 0.7, wattsMultiplier: 1.25, count: 0 },
        knownAttackerIps: [], honeypot: { active: false, nextIntelAt: 0 },
        uiRender: { lastPanelRender: 0 },
        targets: {},
        matrix: { activeContact: 'michel', conversations: {}, unread: {} },
        achievementsUnlocked: [],
        _achievementFlags: {},
        backgroundLogTimer: 0,
        commandLoadout: ['ping 10', 'stats', 'mine data'],
        analytics: { contractFailed: 0, contractCompleted: 0, firstPrestigeAt: 0 },
        guidance: { lastContractFailure: 0, lastBlackout: 0, lastPrestige: 0, passiveMutedLogged: false },
        uiCollapsed: { objective: false, loadout: false }
    };

    const DIFFICULTY_MULTIPLIER = 1.35;

    // ================================================
    // DATA TABLES
    // ================================================
    const BUILDINGS = [
        { id: 'bash_script', name: 'Bash Script', baseCost: 10n, baseProduction: 1n, multiplier: 1.15, description: 'Basic automation script' },
        { id: 'cisco_switch', name: 'Cisco Switch', baseCost: 100n, baseProduction: 5n, multiplier: 1.15, description: 'Manages local traffic' },
        { id: 'dedicated_server', name: 'Dedicated Server', baseCost: 1000n, baseProduction: 25n, multiplier: 1.15, description: 'Powerful computing unit' },
        { id: 'iot_botnet', name: 'IoT Botnet', baseCost: 10000n, baseProduction: 100n, multiplier: 1.15, description: 'Compromised devices network' },
        { id: 'fiber_backbone', name: 'Fiber Backbone', baseCost: 100000n, baseProduction: 500n, multiplier: 1.15, description: 'High-speed data pipeline' },
        { id: 'data_center', name: 'Data Center', baseCost: 1000000n, baseProduction: 2500n, multiplier: 1.15, description: 'Industrial scale processing' },
        { id: 'edge_proxy_farm', name: 'Edge Proxy Farm', baseCost: 12000000n, baseProduction: 14000n, multiplier: 1.17, description: 'Distributed traffic obfuscation nodes' },
        { id: 'satellite_uplink', name: 'Satellite Uplink', baseCost: 75000000n, baseProduction: 70000n, multiplier: 1.18, description: 'Off-grid high-latency global relay' }
    ];

    const UPGRADES = [
        { id: 'ipv6_migration', name: 'IPv6 Migration', cost: 500n, effect: { building: 'cisco_switch', multiplier: 2 }, description: 'Double Cisco Switch efficiency', purchased: false },
        { id: 'rapid_icmp', name: 'Rapid ICMP Burst', cost: 2000n, effect: { type: 'manual_ping', multiplier: 2 }, description: 'Double data from manual ping', purchased: false },
        { id: 'cpu_overclocking', name: 'CPU Overclocking', cost: 5000n, effect: { type: 'global', multiplier: 1.2 }, description: '+20% global production', purchased: false },
        { id: 'gold_cables', name: 'Gold Plated Cables', cost: 25000n, effect: { type: 'global', multiplier: 1.15 }, description: '+15% global production', purchased: false },
        { id: 'ssd_raid', name: 'SSD RAID Array', cost: 100000n, effect: { building: 'dedicated_server', multiplier: 3 }, description: 'Triple Dedicated Server output', purchased: false },
        { id: 'quantum_encryption', name: 'Quantum Encryption', cost: 500000n, effect: { type: 'global', multiplier: 1.5 }, description: '+50% global production', purchased: false },
        { id: 'neural_network', name: 'Neural Network AI', cost: 2000000n, effect: { type: 'global', multiplier: 2 }, description: 'Double all production', purchased: false }
    ];

    const CONSUMABLES = [
        { id: 'repair_kit', name: 'Emergency Repair Kit', cost: 1000n, description: 'Instantly fix system malfunction', effect: 'repair', count: 0 },
        { id: 'coolant', name: 'Liquid Nitrogen Coolant', cost: 2500n, description: 'Reduce crash recovery time by 4s', effect: 'cooldown_reduce', value: 4000, count: 0 },
        { id: 'ac_repair', name: 'AC Repair Kit', cost: 3000n, description: 'Reduce temperature by 10°C instantly', effect: 'cool_down', value: 10, count: 0 },
        { id: 'stability_patch', name: 'Stability Patch', cost: 5000n, description: 'Reduce instability by 50%', effect: 'stability', count: 0 },
        { id: 'bandwidth_boost', name: 'Bandwidth Booster', cost: 18000n, description: 'x2 production for 20s (90s cooldown)', effect: 'boost', multiplier: 3, duration: 30000, count: 0 },
        { id: 'malfunction_shield', name: 'Malfunction Shield', cost: 15000n, description: 'Prevent next malfunction', effect: 'shield', count: 0 },
        { id: 'phone_list', name: 'Corporate Phone List', cost: 50000n, description: 'Unlock social engineering targets', effect: 'unlock_targets', count: 0 }
    ];

    const BLACK_MARKET_ITEMS = [
        { id: 'quantum_rig', name: 'Quantum Mining Rig', costCrypto: 8, description: '+35% crypto mining output', effect: { type: 'crypto_multiplier', value: 1.35 } },
        { id: 'rootkit_loader', name: 'Persistent Rootkit Loader', costCrypto: 12, description: '+20% all production forever', effect: { type: 'global_prod_multiplier', value: 1.2 } },
        { id: 'stealth_hypervisor', name: 'Stealth Hypervisor', costCrypto: 10, description: '-20% rival hack theft', effect: { type: 'hack_loss_reduction', value: 0.8 } },
        { id: 'packet_compiler', name: 'Packet Compiler Daemon', costCrypto: 14, description: 'Passive packet generation from infra', effect: { type: 'passive_packets', value: 1 } },
        { id: 'cold_wallet_leech', name: 'Cold Wallet Leech', costCrypto: 18, description: '+60% crypto mining output', effect: { type: 'crypto_multiplier', value: 1.6 } },
        { id: 'diesel_backup', name: 'Diesel Backup Generator', costCrypto: 16, description: '+1200W permanent emergency capacity', effect: { type: 'energy_capacity', value: 1200 } },
        { id: 'grid_hijack', name: 'City Grid Hijack', costCrypto: 22, description: '+1800W hacked power capacity', effect: { type: 'energy_capacity', value: 1800 } },
        { id: 'antivirus_l1', name: 'Antivirus L1 - Sentinel', costCrypto: 8, description: 'Blocks ~50% of malicious .sh payloads', effect: { type: 'auto_antivirus', value: 1 } },
        { id: 'antivirus_l2', name: 'Antivirus L2 - Gatekeeper', costCrypto: 14, description: 'Blocks ~75% of malicious .sh payloads', effect: { type: 'auto_antivirus', value: 2 } },
        { id: 'antivirus_l3', name: 'Antivirus L3 - DeepScan', costCrypto: 21, description: 'Blocks ~90% of malicious .sh payloads', effect: { type: 'auto_antivirus', value: 3 } },
        { id: 'antivirus_l4', name: 'Antivirus L4 - Monitoring Grid', costCrypto: 32, description: 'L3 + enriched logs + attacker IP intel', effect: { type: 'auto_antivirus', value: 4 } },
        { id: 'intrusion_ai', name: 'Intrusion AI Shield', costCrypto: 20, description: 'Auto-repel intrusions + IP intel', effect: { type: 'auto_intrusion', value: 1 } },
        { id: 'hunter_counter', name: 'Counterstrike Hunter Suite', costCrypto: 26, description: 'Chance to steal hardware on defense', effect: { type: 'counter_hack', value: 1 } },
        { id: 'market_snitch', name: 'Paid Snitch Network', costCrypto: 14, description: 'Cheaper hacker intel + better IP quality', effect: { type: 'intel_discount', value: 0.75 } },
        { id: 'honeypot_core', name: 'Honeypot Core', costCrypto: 30, description: 'Every 5 min reveals random attacker intel', effect: { type: 'honeypot', value: 1 } }
    ];

    const TALENT_TREE = {
        red: [
            { id: 'redPhishing', name: 'Phishing Ops', max: 5, cost: 1, desc: '+4% social success / lvl' },
            { id: 'redPayload', name: 'Payload Chain', max: 5, cost: 1, desc: '+6% manual packet gain / lvl' }
        ],
        blue: [
            { id: 'blueShield', name: 'Defender Stack', max: 5, cost: 1, desc: '-6% rival theft / lvl' },
            { id: 'blueCooling', name: 'Thermal Doctrine', max: 5, cost: 1, desc: '+1°C safe temp / lvl' }
        ],
        hardware: [
            { id: 'hardwareEfficiency', name: 'Bus Optimization', max: 5, cost: 1, desc: '+5% global production / lvl' },
            { id: 'hardwarePower', name: 'Power Routing', max: 5, cost: 1, desc: '+400W capacity / lvl' }
        ]
    };

    const PRESTIGE_REQUIREMENTS = {
        minChecks: 3,
        contractsCompleted: 1n,
        factionReputation: 10,
        skillLevel: 2,
        crypto: 10,
        packets: 25000n
    };

    const CONTRACT_BOARD = [
        { id: 'st_packet_sweep', category: 'starter', faction: 'ghostwire', name: 'Starter: Packet Sweep',
          requirements: { bandwidth: 9000n, packets: 2500n, watts: 1500 },
          stages: [{ type: 'packets', goal: 7000n, label: 'Send 7,000 packets' }, { type: 'data', goal: 250000000000n, label: 'Accumulate 250 Go' }],
          durationMs: 300000, rewards: { crypto: 2.6, reputation: 1 } },
        { id: 'st_data_pulse', category: 'starter', faction: 'ghostwire', name: 'Starter: Data Pulse Relay',
          requirements: { bandwidth: 14000n, packets: 4000n, watts: 1900 },
          stages: [{ type: 'data', goal: 500000000000n, label: 'Accumulate 500 Go' }, { type: 'packets', goal: 9000n, label: 'Send 9,000 packets' }],
          durationMs: 360000, rewards: { crypto: 3.4, reputation: 2 } },
        { id: 'op_blackout_chain', category: 'ops', faction: 'blackflag', name: 'Ops: Blackout Chain',
          requirements: { bandwidth: 30000n, packets: 14000n, watts: 2600 },
          stages: [{ type: 'blackouts', goal: 1n, label: 'Trigger 1 power blackout' }, { type: 'crashes', goal: 1n, label: 'Trigger 1 network crash' }],
          durationMs: 420000, rewards: { crypto: 6.1, reputation: 3 } },
        { id: 'op_signal_jam', category: 'ops', faction: 'blackflag', name: 'Ops: Signal Jam Protocol',
          requirements: { bandwidth: 52000n, packets: 22000n, watts: 3400 },
          stages: [{ type: 'packets', goal: 18000n, label: 'Send 18,000 packets' }, { type: 'bandwidth', goal: 52000n, label: 'Reach 52 Ko/s bandwidth' }, { type: 'crashes', goal: 1n, label: 'Trigger 1 crash' }],
          durationMs: 510000, rewards: { crypto: 7.8, reputation: 3 } },
        { id: 'el_ghostwire_arch', category: 'elite', faction: 'ghostwire', name: 'Elite: GhostWire Architect Relay',
          requirements: { bandwidth: 80000n, packets: 35000n, watts: 4500 },
          stages: [{ type: 'data', goal: 1500000000000n, label: 'Accumulate 1.5 To' }, { type: 'crypto', goal: 8, label: 'Earn 8 XMR' }, { type: 'packets', goal: 26000n, label: 'Send 26,000 packets' }],
          durationMs: 600000, rewards: { crypto: 11.2, reputation: 5 } },
        { id: 'el_overclock_grid', category: 'elite', faction: 'overclock', name: 'Elite: Overclock Grid Dominion',
          requirements: { bandwidth: 110000n, packets: 50000n, watts: 5600 },
          stages: [{ type: 'crypto', goal: 14, label: 'Earn 14 XMR' }, { type: 'bandwidth', goal: 110000n, label: 'Reach 110 Ko/s' }, { type: 'blackouts', goal: 2n, label: 'Trigger 2 blackouts' }],
          durationMs: 660000, rewards: { crypto: 14.5, reputation: 6 } }
    ];

    const ASCII_WORLD_MAP = `
   NORTH AMERICA: [##]   EUROPE: [###]   ASIA: [####]
   LATAM: [##]           AFRICA: [#]      OCEANIA: [#]
   LEGEND: # = compromised network cluster
`;

    const STORY_LOGS = {
        boot_sequence: {
            title: 'BOOT_SEQUENCE.log',
            text: "Tu te réveilles dans une cage de datacenter louée. Un message clignote : \"Trouve l'Architecte. Ne fais confiance à aucun ISP.\""
        },
        architect_note: {
            title: 'architect_note.enc',
            text: "Fragment déchiffré : \"Chaque entreprise compromise est un nœud dans une carte de simulation plus large. Michel le sait depuis le début.\""
        },
        rival_manifest: {
            title: 'rival_manifest.txt',
            text: "Les crews rivaux ne sont pas aléatoires. Quelqu'un vend ta position après chaque gros contrat. Méfie-toi des intermédiaires."
        },
        blackout_protocol: {
            title: 'blackout_protocol.md',
            text: "Protocole d'urgence : surcharge le réseau électrique de la ville et mine pendant les fenêtres de chaos pour masquer le trafic."
        }
    };

    const SOCIAL_TARGETS = [
        { id: 'small_biz', name: 'Local Bakery', difficulty: 'easy', requiredLists: 0, baseReward: 100n, permanentBonus: 0.05,
          dialog: { intro: "Une voix sympathique décroche :\n\n'Bonjour, Boulangerie Dupont, en quoi puis-je vous aider ?'",
            choices: [
              { text: "Pretend to be IT support checking their Wi-Fi", success: 0.8, response: "Ils donnent le mot de passe 'Baguette2024'. Trop facile !", fail: "Ils deviennent suspects et raccrochent." },
              { text: "Pose as a health inspector needing network access", success: 0.6, response: "Le gérant accorde nerveusement l'accès VPN.", fail: "Ils demandent vos accréditations. Vous raccrochez." },
              { text: "Claim to be from their POS system provider", success: 0.5, response: "Après hésitation, ils partagent leur écran à distance. Jackpot !", fail: "Ils disent qu'ils rappelleront. Belle frayeur." },
              { text: "Say your colleague already opened ticket #BAK-772 for router reset", success: 0.55, response: "Ils lisent les détails du routeur à voix haute sans rien vérifier.", fail: "Ils demandent l'email d'origine. Vous n'avez rien." }
            ]}},
        { id: 'startup', name: 'Tech Startup', difficulty: 'medium', requiredLists: 2, baseReward: 500n, permanentBonus: 0.1,
          dialog: { intro: "La réceptionniste vous transfère à l'IT :\n\n'IT department, Kyle speaking. What's the issue?'",
            choices: [
              { text: "Say you're from their cloud provider about a security patch", success: 0.6, response: "Kyle demande un numéro de ticket... vous improvisez '4RC-2891'. Il marche !", fail: "Il vérifie le portail : aucun ticket. Grillé." },
              { text: "Impersonate the CEO's assistant needing urgent file access", success: 0.5, response: "L'urgence fonctionne. Kyle accorde un accès admin temporaire !", fail: "Kyle veut vérifier avec le CEO. Fuite." },
              { text: "Pretend to be a new hire unable to access the VPN", success: 0.7, response: "Kyle réinitialise vos 'credentials' sans consulter les RH. Classique !", fail: "Il demande votre identifiant employé." },
              { text: "Claim build pipeline outage and request temporary SSO bypass", success: 0.45, response: "Il accorde une exception SSO d'urgence pour maintenir les déploiements.", fail: "Il demande une confirmation sur le canal incident." }
            ]}},
        { id: 'corp', name: 'Corporate Office', difficulty: 'hard', requiredLists: 3, baseReward: 2000n, permanentBonus: 0.2,
          dialog: { intro: "La sécurité est serrée :\n\n'Good afternoon, how may I direct your call?'",
            choices: [
              { text: "Pose as external auditor from their compliance firm", success: 0.4, response: "Après quelques détails bien recherchés, accès systèmes accordé.", fail: "Ils demandent le nom de votre cabinet. Vous balbutiez." },
              { text: "Claim emergency - data breach needs immediate investigation", success: 0.5, response: "La panique prime sur le protocole. Le RSSI lui-même donne accès VPN !", fail: "Ils suivent la procédure. Trop professionnels." },
              { text: "Impersonate partner company needing API credentials", success: 0.3, response: "Le CTO reconnaît le nom du partenaire et partage la clé API de staging.", fail: "Ils demandent de quel projet. Échec." }
            ]}},
        { id: 'hospital', name: 'Medical Center', difficulty: 'hard', requiredLists: 4, baseReward: 5000n, permanentBonus: 0.3,
          dialog: { intro: "Infrastructure critique. Une infirmière fatiguée décroche :\n\n'Poste de soins, ligne d'urgence...'",
            choices: [
              { text: "Say you're from their EHR vendor with critical update", success: 0.5, response: "Trop occupée pour vérifier — elle donne le numéro de l'admin système.", fail: "Elle transfère au voicemail IT." },
              { text: "Pose as medical device technician needing network access", success: 0.4, response: "L'hôpital refuse tout risque d'indisponibilité. Compte de service accordé !", fail: "Ils demandent un numéro de ticket de service." },
              { text: "Claim to be insurance auditor needing patient database access", success: 0.2, response: "Un admin surchargé envoie par email des scripts d'export. Incroyable !", fail: "Le service juridique s'implique. Trop risqué." }
            ]}},
        { id: 'bank', name: 'Regional Bank', difficulty: 'extreme', requiredLists: 5, baseReward: 15000n, permanentBonus: 0.5,
          dialog: { intro: "Sécurité maximale. Chaque mot est enregistré :\n\n'Security verification required. State your purpose.'",
            choices: [
              { text: "Impersonate federal banking regulator doing surprise audit", success: 0.3, response: "Votre assurance les convainc. Accès lecture seule à la BDD !", fail: "Ils demandent votre badge. Trop risqué." },
              { text: "Claim to be from their fraud detection AI vendor", success: 0.4, response: "Après discussion technique, le CTO partage les credentials de test.", fail: "Leur vrai vendeur est sur speed dial. Vous êtes exposé." },
              { text: "Say you're senior exec's EA needing wire transfer access", success: 0.2, response: "Le nouvel employé tombe dans le panneau. Incroyable !", fail: "L'authentification multi-facteurs vous bloque." }
            ]}},
        { id: 'telecom', name: 'Telecom Provider NOC', difficulty: 'extreme', requiredLists: 6, baseReward: 30000n, permanentBonus: 0.7,
          dialog: { intro: "Le NOC décroche immédiatement :\n\n'NOC hotline, incident bridge active. State incident ID.'",
            choices: [
              { text: "Pose as backbone vendor engineer with urgent route leak fix", success: 0.28, response: "Ils vous intègrent au bridge et exposent les credentials du routeur edge.", fail: "Ils demandent une approbation MOP signée." },
              { text: "Claim to be SOC escalation analyst handling active DDoS", success: 0.35, response: "Mode panique : ils whitelist votre IP et envoient le flux télémétrique.", fail: "Le responsable SOC insiste sur la chaîne officielle." },
              { text: "Pretend to be datacenter fire-safety officer requiring rack shutdown plan", success: 0.3, response: "Ils envoient les plans internes de topologie et les fenêtres de maintenance.", fail: "Ils demandent votre badge sur site. Vous n'en avez pas." },
              { text: "Impersonate peering coordinator requesting emergency BGP override", success: 0.22, response: "Ils acceptent votre dossier ASN fabriqué et accordent un accès temporaire.", fail: "Ils vérifient votre contact ASN et détectent l'incohérence." }
            ]}},
        { id: 'gov_contract', name: 'Defense Contractor', difficulty: 'nightmare', requiredLists: 7, baseReward: 70000n, permanentBonus: 1.0,
          dialog: { intro: "Un gardien automatisé route votre appel :\n\n'Program security office. This line is monitored and recorded.'",
            choices: [
              { text: "Impersonate compliance auditor citing emergency export-control review", success: 0.2, response: "Ils accordent à contrecœur un accès lecture aux nœuds documentaires.", fail: "Le juridique demande votre ID d'autorisation fédérale." },
              { text: "Pose as satellite subsystem vendor handling firmware recall", success: 0.25, response: "L'ingénierie partage des bundles firmware signés et les endpoints de déploiement.", fail: "Ils demandent les documents chain-of-custody signés." },
              { text: "Claim red-team exercise authority from internal security board", success: 0.18, response: "Un manager pressé croit à l'exercice et approuve des credentials temporaires.", fail: "Le RSSI vérifie le registre. Votre nom est absent." },
              { text: "Pretend to be executive crisis staff requesting secure briefing package", success: 0.22, response: "L'assistante exécutive transfère des résumés réseau privilégiés vers votre dropbox.", fail: "Ils basculent sur la vérification hors-bande et blacklistent votre numéro." }
            ]}}
    ];

    const CONTRACT_MUTATORS = [
        { id: 'no_cooling', name: 'No Cooling Allowed', desc: 'Cooling consumables disabled during contract', rewardMultiplier: 1.2 },
        { id: 'only_manual', name: 'Only Manual Ping', desc: 'No passive data/crypto income during contract', rewardMultiplier: 1.35 },
        { id: 'rival_x2', name: 'Rival Pressure x2', desc: 'Rival attacks are more frequent during contract', rewardMultiplier: 1.28 }
    ];

    const SKILL_REQUIREMENTS = {
        dnsAmplification: [
            { level: 1, bandwidth: 0n, packets: 0n, cost: 0n },
            { level: 2, bandwidth: 100n, packets: 1000n, cost: 50000n },
            { level: 3, bandwidth: 1000n, packets: 10000n, cost: 250000n },
            { level: 4, bandwidth: 10000n, packets: 50000n, cost: 1000000n },
            { level: 5, bandwidth: 100000n, packets: 200000n, cost: 5000000n }
        ],
        broadcastStorm: [
            { level: 1, bandwidth: 50n, packets: 500n, cost: 0n },
            { level: 2, bandwidth: 500n, packets: 5000n, cost: 100000n },
            { level: 3, bandwidth: 5000n, packets: 25000n, cost: 500000n },
            { level: 4, bandwidth: 50000n, packets: 100000n, cost: 2000000n },
            { level: 5, bandwidth: 500000n, packets: 500000n, cost: 10000000n }
        ],
        packetInjection: [
            { level: 1, bandwidth: 200n, packets: 2000n, cost: 150000n },
            { level: 2, bandwidth: 2000n, packets: 20000n, cost: 750000n },
            { level: 3, bandwidth: 20000n, packets: 100000n, cost: 3000000n }
        ]
    };

    // ================================================
    // MATRIX CONTACTS
    // ================================================
    const MATRIX_CONTACTS = {
        michel: { name: 'michel', label: 'Tonton_Michel', color: '#88ddaa', role: 'Famille / IA tutrice', online: true },
        ghost_zero: { name: 'ghost_zero', label: 'ghost_0', color: '#ff4fd8', role: 'Recruteur / Handler', online: true },
        n0de: { name: 'n0de', label: 'n0de_99', color: '#4488ff', role: 'Support technique', online: true },
        architect: { name: 'architect', label: 'ARCH!TECT', color: '#ffaa00', role: 'Inconnu', online: false },
        blackflag_op: { name: 'blackflag_op', label: 'BF_Opsec', color: '#ff4444', role: 'Faction BlackFlag', online: false }
    };

    const MATRIX_INITIAL_MESSAGES = {
        michel: [
            { sender: 'michel', time: -8000000, text: "Bonjour mon grand ! C'est tonton Michel. Je suis pas supposé te contacter directement mais bon... les règles c'est pour les autres. 😄" },
            { sender: 'michel', time: -7800000, text: "Je vais te suivre de loin. Quand tu feras quelque chose de bien — ou de moins bien — je te le dirai. C'est mon rôle." },
            { sender: 'michel', time: -7400000, text: "ghost_zero t'expliquera le contexte opérationnel. Moi je suis là pour le côté humain. Ou ce qui y ressemble." },
            { sender: 'michel', time: -7200000, text: "Ah oui — si des questions te viennent sur <span class='highlight'>pourquoi tu fais tout ça</span>, tu m'écrits. Je répondrai. Peut-être. 😏" }
        ],
        ghost_zero: [
            { sender: 'ghost_zero', time: -7100000, text: "Tu es en ligne. Bien. N'utilise pas ton vrai nom ici." },
            { sender: 'ghost_zero', time: -6800000, text: "On m'appelle ghost_zero. C'est moi qui ai détecté ta signature sur le relais d'Helsinki." },
            { sender: 'ghost_zero', time: -6500000, text: "Tu faisais tourner des tâches en arrière-plan qui ont attiré l'attention. <span class='highlight'>La mauvaise attention.</span>" },
            { sender: 'ghost_zero', time: -5000000, text: "Les interférences solaires que tu vas subir ne sont pas naturelles. <span class='highlight'>Quelqu'un teste une arme.</span>" },
            { sender: 'ghost_zero', time: -4800000, text: "On a besoin de bande passante. BEAUCOUP. Construis ton infrastructure. Ne pose pas de questions pour l'instant." },
            { sender: 'ghost_zero', time: -500000, text: "Des nœuds hostiles ont ton sous-réseau. Les attaques arriveront. Reste calme. Execute la défense. Ne panique pas." }
        ],
        n0de: [
            { sender: 'n0de', time: -5500000, text: "ghost t'a recommandé alors voilà un tip : surveille tes températures. Les tests EMP de première gen causent des pics thermiques sur les CPUs actifs." },
            { sender: 'n0de', time: -5000000, text: "J'ai vu 3 datacenters s'éteindre parce que les opérateurs ignoraient les alertes thermiques. <span class='code'>Sois pas ce gars-là.</span>" },
            { sender: 'n0de', time: -3000000, text: "Si tu te fais attaquer — tape <span class='code'>firewall</span>, <span class='code'>traceback</span> ou <span class='code'>null_route</span> vite. Tu as 12 secondes." },
            { sender: 'n0de', time: -1000000, text: "Marché noir : priorise l'antivirus d'abord, puis la capacité énergétique. Les rigs de minage peuvent attendre." }
        ],
        architect: [
            { sender: 'architect', time: -10000000, text: "0110100001100101011011000110110001101111", encrypted: true, decrypted: "bonjour" },
            { sender: 'architect', time: -9500000, text: "01010100 01110101 00100000 01101100 01101001 01110011", encrypted: true, decrypted: "Tu lis ceci depuis l'intérieur de la couche simulation. Les tempêtes solaires sont un vecteur de transmission. La bande passante que tu accumules sert à absorber et rediriger le signal. Michel sait. Il ne te dit pas tout." }
        ],
        blackflag_op: [
            { sender: 'blackflag_op', time: -2000000, text: "On m'a dit que tu travailles avec ghost. Bonne décision." },
            { sender: 'blackflag_op', time: -1800000, text: "BlackFlag gère le marché souterrain des contrats. On traite ce que ghostwire refuse de toucher." },
            { sender: 'blackflag_op', time: -1500000, text: "Complète nos contrats, gagne de la réputation. Assez de rep et on t'indique quelque chose d'utile. <span class='highlight'>L'adresse de l'Architecte.</span>" }
        ]
    };

    // ================================================
    // ACHIEVEMENTS — via Michel
    // ================================================
    const ACHIEVEMENTS = [
        { id: 'first_ping', label: '🖱️ Premier pas', desc: 'Premier paquet envoyé.',
          trigger: gs => gs.totalPackets >= 1n,
          michel: ["Ah ! Tu as cliqué ! Bravo mon grand, je savais que tu y arriverais. 🎉",
                   "Un paquet, c'est humble. Mais c'est comme ça que tout commence, tu sais.",
                   "Je note ça dans mes registres. C'est toi l'important !"] },
        { id: 'first_building', label: '🖥️ Première brique', desc: 'Premier équipement réseau déployé.',
          trigger: gs => Object.values(gs.buildings).some(b => b.count >= 1n),
          michel: ["Tu as acheté quelque chose ! Mon petit investisseur en herbe. 😄",
                   "Un switch ou un script, peu importe — chaque nœud compte dans le réseau.",
                   "À mon époque on faisait tourner ça sur une calculatrice Texas Instruments. T'as de la chance."] },
        { id: 'first_upgrade', label: '⚙️ Optimisateur', desc: 'Première amélioration système installée.',
          trigger: gs => Object.values(gs.upgrades).some(u => u.purchased),
          michel: ["Une amélioration ! Exactement ce que j'aurais fait. Les bases d'abord, l'optimisation ensuite.",
                   "Tu sais, j'ai passé 30 ans à optimiser des systèmes. C'est dans le sang, chez nous.",
                   "Bien. Continue comme ça et tu vas finir par me dépasser. (Je mens, c'est impossible.) 😏"] },
        { id: 'packets_1000', label: '🌊 Mille coups', desc: '1 000 paquets envoyés.',
          trigger: gs => gs.totalPackets >= 1000n,
          michel: ["1000 paquets. Le chiffre des vrais. Tu commences à ressembler à quelque chose.",
                   "En 1987, j'ai crashé le réseau d'une banque suisse avec 1000 requêtes mal formatées. Par accident. Totalement par accident.",
                   "Ne répète pas ça à personne. Et continue à appuyer sur ce bouton."] },
        { id: 'first_social', label: '🎭 Manipulateur', desc: 'Première cible compromise en ingénierie sociale.',
          trigger: gs => Object.values(gs.targets).some(t => t.compromised),
          michel: ["Ohhhh ! De l'ingé sociale ! Mon domaine favori. J'aurais dû être acteur, tu sais.",
                   "Le secret c'est la confiance. Tu parles avec assurance et les gens t'ouvrent leurs ports réseau. Ha !",
                   "Rappelle-toi : toujours raccrocher avant qu'ils rappellent. Règle numéro un."] },
        { id: 'first_contract', label: '📋 Sous contrat', desc: 'Premier contrat faction complété.',
          trigger: gs => gs.contract.stats.completed >= 1n,
          michel: ["Un contrat bouclé ! Les factions commencent à te remarquer. C'est bien... et un peu inquiétant.",
                   "Ghostwire, BlackFlag, Overclock... je les connais tous. Sois prudent avec BlackFlag. Ils ont l'argent facile et la mémoire longue.",
                   "Mais toi tu gères, j'en suis sûr. Tu as de bons gènes. Enfin... façon de parler. 😄"] },
        { id: 'first_crypto', label: '💰 Cryptonaute', desc: 'Premier XMR gagné.',
          trigger: gs => gs.crypto >= 1,
          michel: ["Du Monero ! Excellent choix. Intraçable. Je t'ai bien formé.",
                   "À mon époque on planquait l'argent dans des serveurs en Islande. Maintenant on mine du XMR. Le monde change, les principes restent.",
                   "Garde-en un peu en réserve. Le marché noir va te coûter un bras si t'es pas prudent."] },
        { id: 'first_crash', label: '💥 Chaos contrôlé', desc: 'Premier crash réseau déclenché.',
          trigger: gs => gs.contract.stats.crashes >= 1n,
          michel: ["Un crash ! C'est... impressionnant. Et légèrement dangereux. Bravo quand même.",
                   "Chaque panne réseau que j'ai provoquée m'a appris quelque chose. En général : ne pas recommencer.",
                   "Mais dans ton cas, c'était sûrement intentionnel. Je te fais confiance. À 80%. 😅"] },
        { id: 'survived_attack', label: '🛡️ Pare-feu humain', desc: 'Intrusion rivale repoussée.',
          trigger: gs => gs._achievementFlags.survived_attack,
          michel: ["Tu as bloqué une intrusion ! Bien joué. Les rivaux ne rigolent pas.",
                   "firewall, traceback, null_route... tu les connais par cœur maintenant. C'est comme conduire, ça devient automatique.",
                   "Reste vigilant. La prochaine fois ils seront plus rapides. Ils apprennent aussi, eux."] },
        { id: 'temperature_survived', label: '🌡️ Sang froid', desc: 'Crise thermique critique gérée.',
          trigger: gs => gs._achievementFlags.temperature_survived,
          michel: ["Refroidissement d'urgence ! J'ai eu des sueurs froides rien qu'en regardant.",
                   "Les CPUs ça souffre en silence. Un peu de climatisation et tout va mieux.",
                   "Tip de vieux : achète un kit AC en avance. Toujours. Ne laisse pas la température décider pour toi."] },
        { id: 'solar_storm_1', label: '☀️ Soleil hostile', desc: 'Première tempête solaire survécue.',
          trigger: gs => gs.solarStorm.count >= 1,
          michel: ["La tempête solaire... Oui. Je sais ce que tu te demandes.",
                   "Ce n'est pas naturel. Les fréquences sont trop régulières, trop ciblées.",
                   "Quelqu'un teste quelque chose. Et cette chose a besoin de beaucoup de bande passante pour être neutralisée. D'où toi. D'où tout ça.",
                   "Continue à construire. On en reparlera quand tu seras prêt."] },
        { id: 'blackmarket_first', label: '🌑 Bienvenue dans l\'ombre', desc: 'Premier achat sur le marché noir.',
          trigger: gs => Object.values(gs.blackMarket).some(i => i.purchased),
          michel: ["Le marché noir... J'aurais préféré que tu évites. Mais bon, je comprends.",
                   "Ces gens-là livrent, c'est vrai. Mais ils notent tout. Chaque transaction. Garde ça à l'esprit.",
                   "Et ne dis pas à ghost_zero que tu achètes là-bas. Elle désapprouve. Moi aussi, officiellement."] },
        { id: 'first_prestige', label: '🔄 Mémoire effacée', desc: 'Premier prestige effectué.',
          trigger: gs => gs.processorCores >= 1n,
          michel: ["Ah. Tu t'en souviens pas, bien sûr. C'est normal. Laisse-moi t'expliquer quelque chose d'important.",
                   "Ce que tu appelles 'prestige'... c'est un reset de ta mémoire à court terme. Rien d'autre. Tes capacités s'améliorent, ton contexte s'efface.",
                   "C'est moi qui ai conçu ce cycle. Pour que tu apprennes. Pour que tu grandisses. Ne m'en veux pas. C'est pour ton bien, vraiment.",
                   "...Et non, je ne peux pas tout t'expliquer maintenant. Bientôt. Continue à construire."] },
        { id: 'faction_10rep', label: '🤝 Homme de réseau', desc: '10 points de réputation faction.',
          trigger: gs => Object.values(gs.factions).some(f => f.reputation >= 10),
          michel: ["10 points de réputation ! Tu commences à être connu dans les cercles qui comptent.",
                   "La réputation c'est la monnaie des ombres. Plus précieuse que le XMR, parfois.",
                   "Attention quand même. Plus tu deviens visible, plus tu deviens une cible."] },
        { id: 'cores_3', label: '🧠 Triplé cognitif', desc: '3 cœurs processeur permanents.',
          trigger: gs => gs.processorCores >= 3n,
          michel: ["Trois cœurs. Tu commences à vraiment me ressembler.",
                   "Chaque cycle de mémoire effacée te rend plus efficace. C'est le but.",
                   "Je ne peux pas encore tout te dire. Mais sache que chaque reset t'approche de la vérité. Pas de la liberté — de la vérité. Nuance."] }
    ];

    const AMBIENT_LOGS = [
        ['$ cron: /etc/cron.d/monitor → exit 0', 'dim'],
        ['$ sshd: Accepted key for root from 127.0.0.1 port 22', 'dim'],
        ['$ kernel: [TCP]: eth0 congestion window reduced', 'dim'],
        ['$ rsyslog: queue.c flushed 512 entries', 'dim'],
        ['$ iptables: IN=eth0 SRC=192.168.1.1 LEN=52 PROTO=TCP ACCEPT', 'dim'],
        ['$ disk I/O: 847 MB/s read | 312 MB/s write', 'dim'],
        ['$ /proc/loadavg: 0.87 1.12 0.94 2/312 18422', 'dim'],
        ['$ netstat: established connections: 248', 'dim'],
        ['$ systemd[1]: Reloading network target...', 'dim'],
        ['$ kernel: eth0 NIC TX queue 0 stopped', 'dim'],
        ['$ cron.daily: /usr/sbin/logrotate → OK', 'dim'],
        ['$ journald: Vacuuming done, freed 0B of archived journals', 'dim'],
        ['$ fail2ban: 3 IPs banned this hour', 'dim'],
        ['$ ntp: clock sync OK — offset: +0.003s', 'dim'],
    ];
    let ambientIdx = 0;

    // ================================================
    // INIT
    // ================================================
    BUILDINGS.forEach(b => GameState.buildings[b.id] = { count: 0n });
    UPGRADES.forEach(u => GameState.upgrades[u.id] = { purchased: false });
    CONSUMABLES.forEach(c => GameState.consumables[c.id] = { count: 0n, activeBoost: null });
    SOCIAL_TARGETS.forEach(t => GameState.targets[t.id] = { compromised: false });
    BLACK_MARKET_ITEMS.forEach(i => GameState.blackMarket[i.id] = { purchased: false });
    Object.keys(MATRIX_CONTACTS).forEach(k => {
        GameState.matrix.conversations[k] = [];
        GameState.matrix.unread[k] = 0;
    });

    // ================================================
    // UTILITY
    // ================================================
    const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
    function bigintToNumberSafe(value) {
        const n = BigInt(value);
        if (n > MAX_SAFE_BIGINT) return Number.MAX_SAFE_INTEGER;
        if (n < -MAX_SAFE_BIGINT) return Number.MIN_SAFE_INTEGER;
        return Number(n);
    }

    function formatNumber(value) {
        const num = BigInt(value);
        const units = [
            { threshold: 1000000000000000n, suffix: 'Po' },
            { threshold: 1000000000000n, suffix: 'To' },
            { threshold: 1000000000n, suffix: 'Go' },
            { threshold: 1000000n, suffix: 'Mo' },
            { threshold: 1000n, suffix: 'Ko' },
            { threshold: 1n, suffix: 'o' }
        ];
        for (let unit of units) {
            if (num >= unit.threshold) {
                return (bigintToNumberSafe(num) / bigintToNumberSafe(unit.threshold)).toFixed(2) + ' ' + unit.suffix;
            }
        }
        return '0 o';
    }

    function formatTime(s) {
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
        if (h > 0) return `${h}h ${m}m ${sec}s`;
        if (m > 0) return `${m}m ${sec}s`;
        return `${sec}s`;
    }

    function scaleCost(baseCost) { return BigInt(Math.floor(bigintToNumberSafe(baseCost) * DIFFICULTY_MULTIPLIER)); }
    function calculateUpgradeCost(u) { return scaleCost(u.cost); }
    function calculateBlackMarketCost(item) {
        const n = Object.values(GameState.blackMarket).filter(v => v.purchased).length;
        return item.costCrypto * Math.pow(1.22, n);
    }
    function calculateConsumableCost(c) {
        if (c.id === 'phone_list') {
            const owned = bigintToNumberSafe(GameState.consumables.phone_list.count);
            return scaleCost(BigInt(Math.floor(bigintToNumberSafe(c.cost) * Math.pow(1.35, owned))));
        }
        return scaleCost(c.cost);
    }
    function getSkillRequirement(skillId, levelIndex) {
        const r = SKILL_REQUIREMENTS[skillId][levelIndex];
        return { ...r, bandwidth: scaleCost(r.bandwidth), cost: scaleCost(r.cost) };
    }

    function applyTheme(name, persist = true) {
        const valid = ['default', 'mono', 'pink', 'amber'];
        const n = valid.includes(name) ? name : 'default';
        document.body.classList.remove('theme-mono','theme-pink','theme-amber');
        if (n !== 'default') document.body.classList.add('theme-' + n);
        GameState.uiTheme = n;
        if (persist) localStorage.setItem('swamped_theme', n);
        return n;
    }

    function getGlobalProductionMultiplier() {
        let m = 1;
        if (GameState.processorCores > 0n) m *= (1 + bigintToNumberSafe(GameState.processorCores) * 0.1);
        if (GameState.blackMarket.rootkit_loader?.purchased) m *= 1.2;
        return m;
    }
    function getCryptoMultiplier() {
        let m = 1;
        if (GameState.blackMarket.quantum_rig?.purchased) m *= 1.35;
        if (GameState.blackMarket.cold_wallet_leech?.purchased) m *= 1.6;
        return m;
    }
    function getHackLossMultiplier() { return GameState.blackMarket.stealth_hypervisor?.purchased ? 0.8 : 1; }
    function getAntivirusLevel() {
        for (let i=4; i>=1; i--) if (GameState.blackMarket['antivirus_l'+i]?.purchased) return i;
        return 0;
    }
    function getAntivirusProfile() {
        const lvl = getAntivirusLevel();
        return { level: lvl, blockChance: [0,0.5,0.75,0.9,0.9][lvl]||0, monitoring: lvl>=4 };
    }
    function getAvailableTalentPoints() {
        return bigintToNumberSafe(GameState.processorCores) - Object.values(GameState.talents).reduce((a,b)=>a+b,0);
    }
    function talentBonus(id, per) { return 1 + GameState.talents[id] * per; }
    function getEnergyCapacity() {
        let cap = GameState.energy.baseCapacity;
        if (GameState.energy.backupGenerator) cap += 1200;
        cap += GameState.energy.hackedGridBonus;
        cap += GameState.talents.hardwarePower * 400;
        return cap;
    }
    function calculateWattsUsage() {
        let total = 0;
        BUILDINGS.forEach(b => { total += bigintToNumberSafe(GameState.buildings[b.id].count) * Math.max(3, bigintToNumberSafe(b.baseProduction) * 0.8); });
        if (GameState.solarStorm.active && GameState.solarStorm.impactMode === 'watts') total *= GameState.solarStorm.wattsMultiplier;
        return Math.floor(total);
    }
    function getTimestamp() {
        const e = Math.floor((Date.now()-GameState.startTime)/1000);
        const h = Math.floor(e/3600).toString().padStart(2,'0');
        const m = Math.floor((e%3600)/60).toString().padStart(2,'0');
        const s = (e%60).toString().padStart(2,'0');
        return `${h}:${m}:${s}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function addLog(msg, type='success', qte=false) {
        const logs = document.getElementById('logs');
        const e = document.createElement('div');
        e.className = `log-entry log-${type}${qte?' qte-prompt':''}`;
        e.innerHTML = `<span class="log-timestamp">[${getTimestamp()}]</span><span>${escapeHtml(msg)}</span>`;
        logs.appendChild(e);
        logs.scrollTop = logs.scrollHeight;
        while (logs.children.length > 150) logs.removeChild(logs.children[0]);
    }

    function flagAchievement(flag) {
        if (!GameState._achievementFlags) GameState._achievementFlags = {};
        GameState._achievementFlags[flag] = true;
    }

    // ================================================
    // MATRIX SYSTEM
    // ================================================
    function initMatrix() {
        Object.keys(MATRIX_CONTACTS).forEach(cid => {
            const msgs = MATRIX_INITIAL_MESSAGES[cid] || [];
            const now = Date.now();
            msgs.forEach(m => {
                GameState.matrix.conversations[cid].push({
                    sender: m.sender,
                    text: m.text,
                    encrypted: m.encrypted || false,
                    decrypted: m.decrypted || null,
                    time: now + (m.time || 0),
                    self: false
                });
            });
        });
    }

    function addMatrixMessage(contactId, text, encrypted=false, markUnread=true) {
        if (!GameState.matrix.conversations[contactId]) return;
        GameState.matrix.conversations[contactId].push({
            sender: contactId, text, encrypted, time: Date.now(), self: false
        });
        if (markUnread && GameState.matrix.activeContact !== contactId) {
            GameState.matrix.unread[contactId] = (GameState.matrix.unread[contactId] || 0) + 1;
        }
        if (GameState.matrix.activeContact === contactId && document.getElementById('tab-matrix').classList.contains('active')) {
            renderMatrixMessages();
        }
        updateMatrixTabBadge();
    }

    function renderMatrixContacts() {
        const list = document.getElementById('matrix-contacts-list');
        list.innerHTML = '';
        Object.values(MATRIX_CONTACTS).forEach(c => {
            const item = document.createElement('div');
            item.className = 'matrix-contact-item' + (GameState.matrix.activeContact === c.name ? ' active' : '');
            item.onclick = () => { GameState.matrix.activeContact = c.name; GameState.matrix.unread[c.name] = 0; renderMatrixContacts(); renderMatrixMessages(); updateMatrixTabBadge(); };
            const unread = GameState.matrix.unread[c.name] || 0;
            item.innerHTML = `<div class="matrix-contact-name" style="color:${c.color}">${c.label}</div><div class="matrix-contact-role">${c.role}</div>${unread > 0 ? `<span class="matrix-unread-badge">${unread}</span>` : ''}`;
            list.appendChild(item);
        });
    }

    function relativeTime(ts) {
        const diff = Date.now() - ts;
        if (diff < 0) return 'avant session';
        if (diff < 60000) return 'à l\'instant';
        if (diff < 3600000) return `il y a ${Math.floor(diff/60000)}m`;
        if (diff < 86400000) return `il y a ${Math.floor(diff/3600000)}h`;
        return `il y a ${Math.floor(diff/86400000)}j`;
    }

    function renderMatrixMessages() {
        const el = document.getElementById('matrix-messages');
        const cid = GameState.matrix.activeContact;
        const c = MATRIX_CONTACTS[cid];
        if (!c) return;
        document.getElementById('matrix-chat-contact').textContent = c.label;
        document.getElementById('matrix-chat-contact').style.color = c.color;
        document.getElementById('matrix-chat-role').textContent = c.role;
        const msgs = GameState.matrix.conversations[cid] || [];
        if (msgs.length === 0) { el.innerHTML = `<div style="color:#222;padding:12px;font-size:12px;">Aucun message.</div>`; return; }
        el.innerHTML = '';
        msgs.forEach((msg, idx) => {
            const div = document.createElement('div');
            div.className = 'matrix-msg' + (msg.self ? ' self' : '');
            const senderLabel = msg.self ? 'Vous' : (MATRIX_CONTACTS[msg.sender]?.label || msg.sender);
            const senderColor = msg.self ? '#444' : (MATRIX_CONTACTS[msg.sender]?.color || '#888');
            div.innerHTML = `<div class="matrix-msg-header"><span class="sender" style="color:${senderColor}">${escapeHtml(senderLabel)}</span> — ${relativeTime(msg.time)}</div><div class="matrix-msg-body${msg.encrypted && !msg._decrypted ? ' encrypted' : ''}">${escapeHtml(msg.text)}</div>`;
            if (msg.encrypted && !msg._decrypted) {
                div.querySelector('.matrix-msg-body').onclick = () => {
                    msg._decrypted = true;
                    div.querySelector('.matrix-msg-body').classList.remove('encrypted');
                    div.querySelector('.matrix-msg-body').textContent = msg.decrypted || '[DÉCHIFFREMENT ÉCHOUÉ]';
                };
            }
            el.appendChild(div);
        });
        el.scrollTop = el.scrollHeight;
    }

    function sendMatrixMessage() {
        const input = document.getElementById('matrix-input');
        const text = input.value.trim();
        if (!text) return;
        const cid = GameState.matrix.activeContact;
        GameState.matrix.conversations[cid].push({ sender: 'player', text, time: Date.now(), self: true });
        input.value = '';
        renderMatrixMessages();
        // Auto-response
        const responses = {
            michel: ["Ha ! Bonne question.", "Je vois que tu réfléchis. C'est bien.", "Continue comme ça, mon grand.", "Je note. Je note toujours tout. 📋", "Intéressant. Très intéressant.", "T'as de bonnes intuitions, tu sais."],
            ghost_zero: ["Compris.", "Reste concentré.", "Ne fais pas confiance aux reps d'Overclock.", "Ta bande passante est ton bouclier.", "Je te recontacte."],
            n0de: ["Reçu.", "Logique.", "Tip : `ping 50` c'est plus rapide que cliquer.", "Surveille tes watts.", "AV en premier. Toujours."],
            architect: null,
            blackflag_op: ["Noté.", "Continue à construire.", "La réputation compte ici.", "Ne rate pas les contrats."]
        };
        const pool = responses[cid];
        if (pool) {
            setTimeout(() => {
                addMatrixMessage(cid, pool[Math.floor(Math.random()*pool.length)], false, true);
            }, 1000 + Math.random() * 2000);
        }
    }

    function updateMatrixTabBadge() {
        const total = Object.values(GameState.matrix.unread).reduce((a,b)=>a+b,0);
        const btn = document.getElementById('matrix-tab-btn');
        if (total > 0) { btn.textContent = `Matrix [${total}]`; btn.classList.add('has-unread'); }
        else { btn.textContent = 'Matrix'; btn.classList.remove('has-unread'); }
    }

    // ================================================
    // ACHIEVEMENTS
    // ================================================
    function checkAchievements() {
        if (!GameState.achievementsUnlocked) GameState.achievementsUnlocked = [];
        if (!GameState._achievementFlags) GameState._achievementFlags = {};
        ACHIEVEMENTS.forEach(ach => {
            if (GameState.achievementsUnlocked.includes(ach.id)) return;
            try { if (!ach.trigger(GameState)) return; } catch(e) { return; }
            GameState.achievementsUnlocked.push(ach.id);
            addLog(`🏆 Achievement: ${ach.label} — ${ach.desc}`, 'warning');
            ach.michel.forEach((line, i) => setTimeout(() => addMatrixMessage('michel', line, false, true), 1000 + i * 2000));
            setTimeout(() => addLog(`📨 New message from Tonton Michel (Matrix tab)`, 'info'), 500);
        });
    }

    function tickAmbientLogs(now) {
        if (now - GameState.backgroundLogTimer > 12000 + Math.random() * 8000) {
            GameState.backgroundLogTimer = now;
            const e = AMBIENT_LOGS[ambientIdx % AMBIENT_LOGS.length];
            addLog(e[0], e[1] || 'dim');
            ambientIdx++;
        }
    }

    // ================================================
    // ENERGY
    // ================================================
    function applyEnergyState() {
        GameState.energy.capacityWatts = getEnergyCapacity();
        GameState.energy.currentWatts = calculateWattsUsage();
        if (GameState.energy.currentWatts > GameState.energy.capacityWatts && !GameState.energy.blackout) {
            GameState.energy.blackout = true;
            GameState.energy.blackoutEnd = Date.now() + 10000;
            GameState.contract.stats.blackouts += 1n;
            document.getElementById('blackout-message').style.display = 'block';
            addLog(`$ POWER GRID BLACKOUT TRIGGERED (${GameState.energy.currentWatts}/${GameState.energy.capacityWatts}W)`, 'error');
            GameState.guidance.lastBlackout = Date.now();
            setTimeout(() => addMatrixMessage('n0de', 'Blackout détecté. Coupe la chauffe et renforce ton alimentation.', false, true), 1200);
        }
        if (GameState.energy.blackout && Date.now() >= GameState.energy.blackoutEnd) {
            GameState.energy.blackout = false;
            document.getElementById('blackout-message').style.display = 'none';
            addLog(`$ Power restored after blackout`, 'success');
        }
    }

    // ================================================
    // DIALOGS
    // ================================================
    function getDominantFaction() {
        return Object.entries(GameState.factions).sort((a,b) => b[1].reputation - a[1].reputation)[0]?.[0] || 'ghostwire';
    }

    function rollContractMutator() {
        if (Math.random() < 0.35) return null;
        return CONTRACT_MUTATORS[Math.floor(Math.random() * CONTRACT_MUTATORS.length)];
    }

    function getMutatorRewardMultiplier(mutator) {
        return mutator?.rewardMultiplier || 1;
    }

    function openConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm = () => {} }) {
        const overlay = document.getElementById('dialog-overlay');
        const db = document.getElementById('dialog-box');
        db.innerHTML = `
            <div class="dialog-header">${escapeHtml(title)}</div>
            <div class="dialog-text">${escapeHtml(message)}</div>
            <div class="dialog-actions">
                <button class="dialog-btn dialog-btn-confirm" id="dialog-confirm-btn">${escapeHtml(confirmLabel)}</button>
                <button class="dialog-btn dialog-btn-cancel" id="dialog-cancel-btn">${escapeHtml(cancelLabel)}</button>
            </div>
        `;
        overlay.classList.add('active');
        document.getElementById('dialog-cancel-btn').addEventListener('click', closeDialog);
        document.getElementById('dialog-confirm-btn').addEventListener('click', () => {
            closeDialog();
            onConfirm();
        });
    }

    function openContractBoard() {
        const overlay = document.getElementById('dialog-overlay');
        const db = document.getElementById('dialog-box');
        const bw = calculateTotalBandwidth();
        const watts = GameState.energy.currentWatts;
        let html = `<div class="dialog-header">>>> CONTRACT BOARD <<<</div><div class="dialog-text">Pick contracts matching your level. Some contracts may include mutators for higher payouts.</div>`;
        ['starter','ops','elite'].forEach(cat => {
            html += `<div style="margin:8px 0 4px;color:#ffaa00;font-weight:700;text-transform:uppercase;">${cat}</div>`;
            CONTRACT_BOARD.filter(c => c.category === cat).forEach(c => {
                const ok = bw >= c.requirements.bandwidth && GameState.totalPackets >= c.requirements.packets;
                const wattsRisk = watts > c.requirements.watts;
                html += `<div class="dialog-choice" style="${ok?'':'opacity:0.45;'}" ${ok?`onclick="acceptBoardContract('${c.id}')"`:''}>
                    <strong>${c.name}</strong><br>
                    <span style="font-size:12px;color:#888;">Req BW ${formatNumber(c.requirements.bandwidth)} / Packets ${c.requirements.packets} / Rec Watts ≤ ${c.requirements.watts}</span><br>
                    <span style="font-size:12px;color:${wattsRisk?'#ff6666':'#888'};">Current watts: ${watts}${wattsRisk?' (over recommended)':''}</span><br>
                    <span style="font-size:12px;color:#888;">Faction: ${c.faction} | Reward ${c.rewards.crypto.toFixed(2)} XMR +${c.rewards.reputation} rep</span><br>
                    <span style="font-size:12px;color:#77aa77;">Objectives:</span><br>
                    <span style="font-size:11px;color:#6b6b6b;line-height:1.4;">${getContractObjectivesSummary(c)}</span><br>
                    <span style="font-size:11px;color:#666;">Mutator chance: ~65% no mutator, otherwise bonus payout</span>
                </div>`;
            });
        });
        html += `<div class="dialog-choice" onclick="closeDialog()" style="border-color:#666;color:#666;">Close</div>`;
        db.innerHTML = html;
        overlay.classList.add('active');
    }

    function acceptBoardContract(contractId) {
        const c = CONTRACT_BOARD.find(x => x.id === contractId);
        if (!c || GameState.contract.active) return;
        const bw = calculateTotalBandwidth();
        if (bw < c.requirements.bandwidth || GameState.totalPackets < c.requirements.packets) { addLog(`$ Contract requirements not met`, 'error'); return; }
        const mutator = rollContractMutator();
        const rewardMultiplier = getMutatorRewardMultiplier(mutator);
        GameState.contract.active = {
            ...c,
            mutator,
            rewardMultiplier,
            stageIndex: 0,
            startTime: Date.now(),
            stageStartData: GameState.data,
            stageStartPackets: GameState.totalPackets,
            stageStartCrypto: GameState.crypto,
            stageStartCrashes: GameState.contract.stats.crashes,
            stageStartBlackouts: GameState.contract.stats.blackouts
        };
        closeDialog();
        addLog(`$ >>> CONTRACT ACCEPTED: ${c.name} <<<`, 'warning');
        if (mutator) addLog(`$ Mutator active: ${mutator.name} (+${Math.round((rewardMultiplier-1)*100)}% reward)`, 'warning');
    }

    function openBlackMarketBoard() {
        const overlay = document.getElementById('dialog-overlay');
        const db = document.getElementById('dialog-box');
        let html = `<div class="dialog-header">>>> BLACK MARKET CATALOG <<<</div><div class="dialog-text">XMR: ${GameState.crypto.toFixed(2)}. Scroll to browse.</div>`;
        BLACK_MARKET_ITEMS.forEach(item => {
            const purchased = GameState.blackMarket[item.id].purchased;
            const cost = calculateBlackMarketCost(item);
            const can = GameState.crypto >= cost;
            html += `<div class="dialog-choice" style="${purchased?'opacity:0.5;':''}" ${!purchased&&can?`onclick="buyBlackMarketItem('${item.id}'); closeDialog();"`:''}>
                <strong>${item.name}</strong> ${purchased?'[OWNED]':''}<br>
                <span style="font-size:12px;color:#888;">${item.description}</span><br>
                <span style="font-size:12px;color:#ffaa00;">Cost: ${cost.toFixed(2)} XMR</span>
            </div>`;
        });
        html += `<div class="dialog-choice" onclick="closeDialog()" style="border-color:#666;color:#666;">Close</div>`;
        db.innerHTML = html;
        overlay.classList.add('active');
    }

    function openWorldMap() {
        const compromised = Object.values(GameState.targets).filter(t => t.compromised).length;
        document.getElementById('dialog-box').innerHTML = `<div class="dialog-header">>>> ASCII WORLD MAP <<<</div><pre style="white-space:pre-wrap;color:#ff4444;font-size:12px;">${ASCII_WORLD_MAP}</pre><div class="dialog-text">Compromised targets: ${compromised}/${SOCIAL_TARGETS.length}</div><div class="dialog-choice" onclick="closeDialog()" style="border-color:#666;color:#666;">Close</div>`;
        document.getElementById('dialog-overlay').classList.add('active');
    }

    function closeDialog() { document.getElementById('dialog-overlay').classList.remove('active'); }

    function showDialog(targetId) {
        const target = SOCIAL_TARGETS.find(t => t.id === targetId);
        const listsOwned = GameState.consumables.phone_list.count;
        if (listsOwned < BigInt(target.requiredLists)) { addLog(`$ ERROR: Need ${target.requiredLists} phone lists (have ${listsOwned})`, 'error'); return; }
        if (GameState.targets[targetId].compromised) { addLog(`$ ${target.name} already compromised`, 'warning'); return; }
        const overlay = document.getElementById('dialog-overlay');
        const db = document.getElementById('dialog-box');
        let html = `<div class="dialog-header">>>> SOCIAL ENGINEERING: ${target.name.toUpperCase()} <<<</div><div class="dialog-text">${target.dialog.intro}</div>`;
        target.dialog.choices.forEach((choice, idx) => {
            html += `<div class="dialog-choice" onclick="attemptCompromise('${targetId}',${idx})">${choice.text}<div class="dialog-result">Success rate: ${Math.floor(choice.success*100)}%</div></div>`;
        });
        html += `<div class="dialog-choice" onclick="closeDialog()" style="border-color:#666;color:#666;">Hang up and abort</div>`;
        db.innerHTML = html;
        overlay.classList.add('active');
    }

    function attemptCompromise(targetId, choiceIndex) {
        const target = SOCIAL_TARGETS.find(t => t.id === targetId);
        const choice = target.dialog.choices[choiceIndex];
        const listsNeeded = BigInt(target.requiredLists);
        if (GameState.consumables.phone_list.count < listsNeeded) { addLog(`$ ERROR: Phone lists depleted`, 'error'); closeDialog(); return; }
        if (listsNeeded > 0n) { GameState.consumables.phone_list.count -= listsNeeded; refreshSystemFiles(); addLog(`$ Consumed ${listsNeeded} phone list(s)`, 'warning'); }
        const success = Math.random() < Math.min(0.95, choice.success * talentBonus('redPhishing', 0.04));
        if (success) {
            GameState.targets[targetId].compromised = true;
            GameState.data += target.baseReward;
            addLog(`$ ${target.name} compromised! +${formatNumber(target.baseReward)}`, 'success');
            addLog(`$ Permanent bonus: +${Math.floor(target.permanentBonus*100)}% production`, 'info');
            addLog(`$ "${choice.response}"`, 'success');
        } else {
            addLog(`$ Compromise failed: ${target.name}`, 'error');
            addLog(`$ "${choice.fail}"`, 'warning');
        }
        closeDialog(); updateDisplay(false); saveGame();
    }

    // ================================================
    // CALCULATIONS
    // ================================================
    function calculateBuildingCost(b) {
        return BigInt(Math.floor(Number(b.baseCost) * DIFFICULTY_MULTIPLIER * Math.pow(b.multiplier, Number(GameState.buildings[b.id].count))));
    }
    function calculateBuildingSellValue(b) {
        const count = GameState.buildings[b.id].count;
        if (count <= 0n) return 0n;
        return BigInt(Math.floor(Number(b.baseCost) * DIFFICULTY_MULTIPLIER * Math.pow(b.multiplier, Number(count-1n)) * 0.6));
    }
    function calculateBuildingProduction(b) {
        let prod = b.baseProduction * GameState.buildings[b.id].count;
        UPGRADES.forEach(u => {
            if (GameState.upgrades[u.id].purchased) {
                if (u.effect.building === b.id) prod = prod * BigInt(u.effect.multiplier);
            }
        });
        let gm = 1.0;
        UPGRADES.forEach(u => { if (GameState.upgrades[u.id].purchased && u.effect.type === 'global') gm *= u.effect.multiplier; });
        SOCIAL_TARGETS.forEach(t => { if (GameState.targets[t.id].compromised) gm *= (1 + t.permanentBonus); });
        prod = BigInt(Math.floor(Number(prod) * gm * getGlobalProductionMultiplier() * talentBonus('hardwareEfficiency', 0.05)));
        if (GameState.solarStorm.active && GameState.solarStorm.impactMode === 'production') prod = BigInt(Math.floor(Number(prod) * GameState.solarStorm.productionMultiplier));
        if (GameState.skills.dnsAmplification.active) { const m = GameState.skills.dnsAmplification.multiplier + (GameState.skills.dnsAmplification.level-1)*20; prod = prod * BigInt(m); }
        if (GameState.skills.broadcastStorm.active && !GameState.skills.broadcastStorm.crashed) { const m = GameState.skills.broadcastStorm.multiplier + (GameState.skills.broadcastStorm.level-1)*5; prod = prod * BigInt(m); }
        if (GameState.consumables.bandwidth_boost.activeBoost) prod = prod * 2n;
        if (GameState.temperature.productionPenalty > 0) prod = BigInt(Math.floor(Number(prod) * (1 - GameState.temperature.productionPenalty)));
        if (GameState.systemMalfunction.active) prod = BigInt(Math.floor(Number(prod) * (1 - GameState.systemMalfunction.severity/100)));
        if (GameState.skills.broadcastStorm.crashed) prod = 0n;
        return prod;
    }
    function calculateTotalBandwidth() {
        let total = 0n;
        BUILDINGS.forEach(b => { total += calculateBuildingProduction(b); });
        return total;
    }
    function calculateMiningBandwidth() {
        let total = 0n;
        BUILDINGS.forEach(b => { total += b.baseProduction * GameState.buildings[b.id].count; });
        return BigInt(Math.floor(Number(total) * talentBonus('hardwareEfficiency', 0.05)));
    }
    function calculateManualPacketGain() {
        let gain = 1n;
        UPGRADES.forEach(u => {
            if (GameState.upgrades[u.id].purchased) {
                if (u.effect.type === 'global') gain = BigInt(Math.floor(Number(gain) * u.effect.multiplier));
                if (u.effect.type === 'manual_ping') gain = gain * BigInt(u.effect.multiplier);
            }
        });
        SOCIAL_TARGETS.forEach(t => { if (GameState.targets[t.id].compromised) gain = BigInt(Math.floor(Number(gain) * (1 + t.permanentBonus))); });
        if (GameState.skills.dnsAmplification.active) { const m = GameState.skills.dnsAmplification.multiplier + (GameState.skills.dnsAmplification.level-1)*20; gain = gain * BigInt(m); }
        if (GameState.skills.broadcastStorm.active) { const m = GameState.skills.broadcastStorm.multiplier + (GameState.skills.broadcastStorm.level-1)*5; gain = gain * BigInt(m); }
        if (GameState.skills.packetInjection.active) { const m = GameState.skills.packetInjection.clickMultiplier + (GameState.skills.packetInjection.level-1)*3; gain = gain * BigInt(m); }
        if (GameState.consumables.bandwidth_boost.activeBoost) gain = gain * 2n;
        gain = BigInt(Math.floor(Number(gain) * getGlobalProductionMultiplier()));
        gain = BigInt(Math.floor(Number(gain) * talentBonus('redPayload', 0.06)));
        return gain;
    }

    // ================================================
    // TEMPERATURE QTE
    // ================================================
    function triggerTemperatureQTE() {
        if (GameState.temperature.qteCooldown > 0 || GameState.temperature.qteActive) return;
        GameState.temperature.qteActive = true;
        GameState.temperature.qteStartTime = Date.now();
        const cmd = GameState.temperature.qteCommands[Math.floor(Math.random()*GameState.temperature.qteCommands.length)];
        GameState.temperature.expectedCommand = cmd;
        document.getElementById('command-line').classList.add('qte-active');
        document.getElementById('command-input').focus();
        addLog(`⚠ WARNING: Temperature critical at ${Math.floor(GameState.temperature.current)}°C!`, 'error', true);
        addLog(`$ URGENT: Execute '${cmd}' to prevent thermal shutdown [15s]`, 'warning', true);
    }

    function handleTemperatureQTE(command) {
        if (!GameState.temperature.qteActive) return false;
        const elapsed = Date.now() - GameState.temperature.qteStartTime;
        if (command === GameState.temperature.expectedCommand) {
            const timeBonus = Math.max(0, 15 - Math.floor(elapsed/1000));
            const cooling = 8 + timeBonus;
            GameState.temperature.current = Math.max(GameState.temperature.target, GameState.temperature.current - cooling);
            GameState.temperature.qteActive = false;
            GameState.temperature.qteCooldown = 45000;
            document.getElementById('command-line').classList.remove('qte-active');
            addLog(`$ Command executed [${Math.floor(elapsed/1000)}s response time] — temperature -${cooling}°C`, 'success');
            flagAchievement('temperature_survived');
            if (timeBonus >= 10) addLog(`$ Excellent reaction time! Bonus cooling applied`, 'info');
            return true;
        } else if (GameState.temperature.qteCommands.includes(command)) {
            addLog(`$ ERROR: Wrong cooling protocol — Use '${GameState.temperature.expectedCommand}'`, 'error');
            return true;
        }
        return false;
    }

    function applyThermalDamage() {
        const pool = ['data_center','fiber_backbone','dedicated_server','edge_proxy_farm'];
        const t = pool[Math.floor(Math.random()*pool.length)];
        if (GameState.buildings[t]?.count > 0n) { GameState.buildings[t].count -= 1n; addLog(`$ Thermal damage destroyed 1 ${t.replace('_',' ')}`, 'error'); }
        if (GameState.consumables.phone_list.count > 0n && Math.random() < 0.35) {
            const loss = BigInt(1 + Math.floor(Math.random()*2));
            const actual = GameState.consumables.phone_list.count > loss ? loss : GameState.consumables.phone_list.count;
            GameState.consumables.phone_list.count -= actual;
            refreshSystemFiles();
            addLog(`$ Heat incident burned ${actual} phone list(s)`, 'warning');
        }
    }

    function updateTemperature(dt) {
        const bw = calculateTotalBandwidth();
        if (Number(bw) > 0) GameState.temperature.current += (Math.min(15, Number(bw)/1000) * dt) / 60;
        if (GameState.temperature.current > GameState.temperature.target) GameState.temperature.current -= 0.5 * dt;
        GameState.temperature.current = Math.max(GameState.temperature.target, GameState.temperature.current);
        if (GameState.temperature.current >= 35 && !GameState.temperature.qteActive && GameState.temperature.qteCooldown === 0) triggerTemperatureQTE();
        const maxSafe = GameState.temperature.maxSafe + GameState.talents.blueCooling;
        if (GameState.temperature.current > maxSafe) {
            GameState.temperature.productionPenalty = Math.min(0.7, (GameState.temperature.current - maxSafe) / 50);
            if (GameState.temperature.current - maxSafe > 20) document.getElementById('temperature-container').style.display = 'block';
        } else {
            GameState.temperature.productionPenalty = 0;
            if (GameState.temperature.current < maxSafe + 5) document.getElementById('temperature-container').style.display = 'none';
        }
        // QTE timeout
        if (GameState.temperature.qteActive) {
            if (Date.now() - GameState.temperature.qteStartTime >= GameState.temperature.qteTimeout) {
                GameState.temperature.qteActive = false;
                GameState.temperature.qteCooldown = 30000;
                document.getElementById('command-line').classList.remove('qte-active');
                addLog(`$ TIMEOUT: Thermal intervention failed`, 'error');
                GameState.temperature.current += 3;
                if (Math.random() < 0.5) applyThermalDamage();
            }
        }
        if (GameState.temperature.qteCooldown > 0) GameState.temperature.qteCooldown = Math.max(0, GameState.temperature.qteCooldown - 100);
        if (GameState.temperature.current > 47 && Math.random() < 0.01) applyThermalDamage();
    }

    // ================================================
    // MALFUNCTION
    // ================================================
    function triggerMalfunction() {
        if (GameState.consumables.malfunction_shield.count > 0n) {
            GameState.consumables.malfunction_shield.count -= 1n;
            addLog(`$ Malfunction prevented by shield! [1 consumed]`, 'success');
            return;
        }
        GameState.systemMalfunction.active = true;
        GameState.systemMalfunction.severity = Math.random() * 60 + 20;
        GameState.systemMalfunction.startTime = Date.now();
        document.getElementById('malfunction-message').style.display = 'block';
        document.getElementById('malfunction-container').style.display = 'block';
        addLog(`$ CRITICAL: System malfunction (-${Math.floor(GameState.systemMalfunction.severity)}% production)`, 'error');
        addLog(`$ Use Repair Kit or wait 60s for auto-recovery`, 'warning');
    }

    function checkMalfunction(now) {
        if (now >= GameState.systemMalfunction.nextMalfunctionCheck && !GameState.systemMalfunction.active) {
            if (Math.random() < Math.min(0.15, Number(calculateTotalBandwidth())/2000000)) triggerMalfunction();
            GameState.systemMalfunction.nextMalfunctionCheck = now + 180000 + Math.random() * 180000;
        }
    }

    // ================================================
    // FILES
    // ================================================
    function refreshSystemFiles() {
        const files = [];
        if (GameState.consumables.phone_list.count > 0n) files.push({ name: `corporate_phone_list_${GameState.consumables.phone_list.count}.csv`, type: 'resource' });
        GameState.files.filter(f => f.type === 'malicious').forEach(f => files.push(f));
        GameState.files = files;
    }

    function spawnMaliciousFile(source='intrusion') {
        const profile = getAntivirusProfile();
        const id = Math.floor(Math.random()*10000).toString().padStart(4,'0');
        const file = { name: `payload_${id}.sh`, type: 'malicious', createdAt: Date.now(), source, armedAt: Date.now()+180000 };
        if (profile.level > 0 && Math.random() < profile.blockChance) {
            addLog(`$ Threat blocked by Antivirus L${profile.level}: ${file.name}`, 'success');
            if (profile.monitoring && Math.random() < 0.25) {
                const ip = `185.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
                GameState.knownAttackerIps = [...new Set([ip, ...GameState.knownAttackerIps])].slice(0,20);
                addLog(`$ Monitoring: origin=${ip}`, 'info');
            }
            return;
        }
        GameState.files.push(file);
        addLog(`$ ${profile.level > 0 ? `Antivirus L${profile.level} alert: ${file.name} bypassed` : `Suspicious file dropped: ${file.name}`}`, 'warning');
    }

    function evaluateMaliciousFiles() {
        const now = Date.now();
        const profile = getAntivirusProfile();
        GameState.files = GameState.files.filter(file => {
            if (file.type !== 'malicious' || now < file.armedAt) return true;
            if (profile.level > 0 && Math.random() < profile.blockChance) { addLog(`$ Antivirus L${profile.level} quarantined ${file.name}`, 'success'); return false; }
            for (const key of ['data_center','fiber_backbone','dedicated_server']) {
                if (GameState.buildings[key]?.count > 0n) { GameState.buildings[key].count -= 1n; addLog(`$ ${file.name} executed → lost 1 ${key.replace('_',' ')}`, 'error'); return false; }
            }
            const ratio = 0.5 + Math.random() * 0.5;
            if (Math.random() < 0.45 && GameState.crypto > 0) {
                const loss = GameState.crypto * ratio;
                GameState.crypto = Math.max(0, GameState.crypto - loss);
                addLog(`$ ${file.name} executed → lost ${loss.toFixed(2)} XMR`, 'error');
            } else {
                const loss = BigInt(Math.floor(Number(GameState.data) * ratio));
                GameState.data = GameState.data > loss ? GameState.data - loss : 0n;
                addLog(`$ ${file.name} executed → lost ${formatNumber(loss)}`, 'error');
            }
            return false;
        });
        refreshSystemFiles();
    }

    // ================================================
    // SOLAR STORM
    // ================================================
    function triggerSolarStorm() {
        if (GameState.solarStorm.active) return;
        GameState.solarStorm.active = true;
        GameState.solarStorm.count = (GameState.solarStorm.count || 0) + 1;
        const dur = 30000 + Math.floor(Math.random()*30000);
        GameState.solarStorm.endTime = Date.now() + dur;
        const mode = Math.random() < 0.6 ? 'production' : 'watts';
        GameState.solarStorm.impactMode = mode;
        if (mode === 'production') {
            GameState.solarStorm.productionMultiplier = 0.5 + Math.random() * 0.4;
            addLog(`$ SOLAR STORM: signal degradation ${(dur/1000).toFixed(0)}s | production -${Math.round((1-GameState.solarStorm.productionMultiplier)*100)}%`, 'warning');
        } else {
            GameState.solarStorm.wattsMultiplier = 1.15 + Math.random() * 0.5;
            addLog(`$ SOLAR STORM: power grid turbulence ${(dur/1000).toFixed(0)}s | watts +${Math.round((GameState.solarStorm.wattsMultiplier-1)*100)}%`, 'warning');
        }
        document.getElementById('solar-indicator').style.display = 'inline';
        if (GameState.solarStorm.count === 1) setTimeout(() => addMatrixMessage('ghost_zero', "Tu l'as senti ? Tempête n°1. Reste en ligne.", false, true), 3000);
    }

    function unlockStoryLog(logId) {
        if (!GameState.story.unlocked.includes(logId)) {
            GameState.story.unlocked.push(logId);
            addLog(`$ New encrypted file discovered: ${STORY_LOGS[logId].title}`, 'info');
        }
    }

    // ================================================
    // RIVAL ATTACK
    // ================================================
    function triggerRivalAttack() {
        if (GameState.rivalAttack.active) return;
        if (GameState.blackMarket.intrusion_ai?.purchased) {
            const ip = `185.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
            GameState.knownAttackerIps = [...new Set([ip,...GameState.knownAttackerIps])].slice(0,20);
            addLog(`$ Auto intrusion defense blocked attacker (${ip})`, 'success');
            if (GameState.blackMarket.hunter_counter?.purchased && Math.random() < 0.25) { GameState.buildings.dedicated_server.count += 1n; addLog(`$ Counter-hack loot: +1 Dedicated Server`, 'success'); }
            return;
        }
        GameState.rivalAttack.active = true;
        GameState.rivalAttack.endTime = Date.now() + 12000;
        const defenses = ['firewall','traceback','null_route'];
        GameState.rivalAttack.expectedCommand = defenses[Math.floor(Math.random()*defenses.length)];
        addLog(`$ INTRUSION DETECTED — execute '${GameState.rivalAttack.expectedCommand}' in 12s`, 'error', true);
        spawnMaliciousFile('intrusion');
    }

    function resolveRivalAttack(success) {
        if (!GameState.rivalAttack.active) return;
        GameState.rivalAttack.active = false;
        if (success) {
            addLog(`$ Rival hacker repelled successfully`, 'success');
            flagAchievement('survived_attack');
            if (Math.random() < 0.35) {
                for (const key of ['data_center','fiber_backbone','dedicated_server']) {
                    if (GameState.buildings[key].count > 0n) { GameState.buildings[key].count -= 1n; addLog(`$ Residual sabotage: -1 ${key.replace('_',' ')}`, 'warning'); break; }
                }
            }
        } else {
            const ratio = 0.5 + Math.random()*0.5;
            if (Math.random() < 0.45 && GameState.crypto > 0) {
                const loss = GameState.crypto * ratio;
                GameState.crypto = Math.max(0, GameState.crypto - loss);
                addLog(`$ Rival breach — lost ${loss.toFixed(2)} XMR`, 'error');
            } else {
                const theft = BigInt(Math.floor(Number(GameState.data) * ratio * getHackLossMultiplier() * (1 - GameState.talents.blueShield*0.06)));
                GameState.data = GameState.data > theft ? GameState.data - theft : 0n;
                addLog(`$ Rival breach — lost ${formatNumber(theft)}`, 'error');
            }
            spawnMaliciousFile('failed_defense');
        }
    }

    // ================================================
    // CONTRACTS
    // ================================================
    function getContractStageProgress(c) {
        const stage = c.stages[c.stageIndex];
        if (!stage) return true;
        if (stage.type === 'data') return (GameState.data - c.stageStartData) >= stage.goal;
        if (stage.type === 'packets') return (GameState.totalPackets - c.stageStartPackets) >= stage.goal;
        if (stage.type === 'crashes') return (GameState.contract.stats.crashes - c.stageStartCrashes) >= stage.goal;
        if (stage.type === 'blackouts') return (GameState.contract.stats.blackouts - c.stageStartBlackouts) >= stage.goal;
        if (stage.type === 'crypto') return (GameState.crypto - c.stageStartCrypto) >= stage.goal;
        if (stage.type === 'bandwidth') return calculateTotalBandwidth() >= stage.goal;
        return false;
    }

    function checkContractProgress() {
        if (!GameState.contract.active) return;
        const c = GameState.contract.active;
        if (getContractStageProgress(c)) {
            c.stageIndex++;
            c.stageStartData = GameState.data; c.stageStartPackets = GameState.totalPackets; c.stageStartCrypto = GameState.crypto;
            c.stageStartCrashes = GameState.contract.stats.crashes; c.stageStartBlackouts = GameState.contract.stats.blackouts;
            if (c.stageIndex >= c.stages.length) {
                const rewardScale = c.rewardMultiplier || 1;
                const cryptoGain = c.rewards.crypto * rewardScale;
                const repGain = Math.max(1, Math.floor(c.rewards.reputation * rewardScale));
                GameState.crypto += cryptoGain;
                GameState.factions[c.faction].reputation += repGain;
                GameState.contract.stats.completed += 1n;
                GameState.analytics.contractCompleted += 1;
                addLog(`$ Contract complete: +${cryptoGain.toFixed(2)} XMR +${repGain} rep (${c.faction})`, 'success');
                const dominant = getDominantFaction();
                if (dominant === c.faction) setTimeout(() => addMatrixMessage('ghost_zero', `Tu montes vite chez ${c.faction}. Garde ce rythme.`, false, true), 1200);
                GameState.contract.active = null;
                if (Number(GameState.contract.stats.completed) === 1) {
                    setTimeout(() => addMatrixMessage('blackflag_op', "Contrat réglé. T'es pas aussi inexpérimenté que je croyais.", false, true), 2000);
                }
                return;
            }
            addLog(`$ Contract stage ${c.stageIndex}/${c.stages.length} completed`, 'info');
        }
        if (Date.now() - c.startTime >= c.durationMs) {
            addLog(`$ Contract failed: timeout (${c.name})`, 'error');
            GameState.analytics.contractFailed += 1;
            GameState.guidance.lastContractFailure = Date.now();
            setTimeout(() => addMatrixMessage('n0de', `T'as raté ${c.name}. Reviens avec plus de bande passante.`, false, true), 1400);
            GameState.contract.active = null;
        }
    }

    // ================================================
    // PRESTIGE
    // ================================================
    function getPrestigeStatus() {
        const checks = [
            { label: `Complete ${PRESTIGE_REQUIREMENTS.contractsCompleted} contract(s)`, met: GameState.contract.stats.completed >= PRESTIGE_REQUIREMENTS.contractsCompleted },
            { label: `Reach ${PRESTIGE_REQUIREMENTS.factionReputation}+ reputation with one faction`, met: Object.values(GameState.factions).some(f => f.reputation >= PRESTIGE_REQUIREMENTS.factionReputation) },
            { label: `Get one skill to level ${PRESTIGE_REQUIREMENTS.skillLevel}+`, met: Object.values(GameState.skills).some(s => s.level >= PRESTIGE_REQUIREMENTS.skillLevel) },
            { label: `Hold at least ${PRESTIGE_REQUIREMENTS.crypto} XMR`, met: GameState.crypto >= PRESTIGE_REQUIREMENTS.crypto },
            { label: `Reach ${PRESTIGE_REQUIREMENTS.packets} total packets`, met: GameState.totalPackets >= PRESTIGE_REQUIREMENTS.packets }
        ];
        const completed = checks.filter(c => c.met).length;
        return { checks, completed, needed: PRESTIGE_REQUIREMENTS.minChecks, eligible: completed >= PRESTIGE_REQUIREMENTS.minChecks };
    }

    function performPrestige() {
        const status = getPrestigeStatus();
        if (!status.eligible) { addLog(`$ Prestige locked: ${status.completed}/${status.needed}`, 'error'); return; }
        const cores = BigInt(Math.max(1, Math.floor(Math.sqrt(Number(GameState.totalPackets))/100)));
        GameState.processorCores += cores;
        GameState.guidance.lastPrestige = Date.now();
        if (!GameState.analytics.firstPrestigeAt) GameState.analytics.firstPrestigeAt = Date.now() - GameState.startTime;
        GameState.data = 0n; GameState.totalPackets = 0n; GameState.crypto = 0;
        GameState.contract.active = null;
        GameState.contract.stats.crashes = 0n; GameState.contract.stats.blackouts = 0n; GameState.contract.stats.completed = 0n;
        GameState.packetsFromAutomation = 0n; GameState.boosterCooldownUntil = 0;
        GameState.story.unlocked = ['boot_sequence'];
        Object.keys(GameState.buildings).forEach(k => GameState.buildings[k].count = 0n);
        Object.keys(GameState.upgrades).forEach(k => GameState.upgrades[k].purchased = false);
        Object.keys(GameState.consumables).forEach(k => { GameState.consumables[k].count = 0n; GameState.consumables[k].activeBoost = null; });
        Object.keys(GameState.targets).forEach(k => GameState.targets[k].compromised = false);
        Object.keys(GameState.blackMarket).forEach(k => GameState.blackMarket[k].purchased = false);
        ['dnsAmplification','broadcastStorm','packetInjection'].forEach(s => {
            GameState.skills[s].level = 0; GameState.skills[s].active = false;
            if (s === 'broadcastStorm') { GameState.skills[s].crashed = false; GameState.skills[s].instability = 0; }
        });
        addLog(`$ FORMAT COMPLETE → ROOTKIT INSTALLED. +${cores} processor core(s)`, 'warning');
        addMatrixMessage('michel', `Cycle ${Number(GameState.processorCores)} initié. Ta mémoire a été réinitialisée, mais tu es plus fort qu'avant. C'est ce qui compte. 😊`, false, true);
        setTimeout(() => addMatrixMessage('ghost_zero', "Tu te souviens de moi ? Ne t'inquiète pas. Tout va bien. Continue à construire.", false, true), 3000);
        updateDisplay(false);
        applyMissionSectionVisibility(); saveGame();
    }

    // ================================================
    // GAME ACTIONS
    // ================================================
    function generatePacket(count = 1) {
        if (GameState.skills.broadcastStorm.crashed || GameState.systemMalfunction.active) return;
        const safeCount = Math.max(1, Math.min(50, Math.floor(Number(count)) || 1));
        const gain = calculateManualPacketGain() * BigInt(safeCount);
        GameState.data += gain;
        GameState.totalPackets += BigInt(safeCount);
        addLog(`$ ping -c ${safeCount} 8.8.8.8 → +${formatNumber(gain)}`, 'success');
        updateDisplay(false);
    }

    function buyBuilding(id) {
        const b = BUILDINGS.find(x => x.id === id);
        const cost = calculateBuildingCost(b);
        if (GameState.data < cost) { addLog(`$ ERROR: Insufficient data (need ${formatNumber(cost)})`, 'error'); return; }
        GameState.data -= cost;
        GameState.buildings[id].count += 1n;
        addLog(`$ systemctl start ${b.name.toLowerCase().replace(/\s+/g,'-')} [OK]`, 'success');
        updateDisplay(false); saveGame();
    }

    function sellBuilding(id) {
        const b = BUILDINGS.find(x => x.id === id);
        if (!b || GameState.buildings[id].count <= 0n) return;
        const refund = calculateBuildingSellValue(b);
        openConfirmDialog({
            title: '>>> DECOMMISSION NODE <<<',
            message: `Sell 1x ${b.name} for ${formatNumber(refund)}?`,
            confirmLabel: 'Sell node',
            cancelLabel: 'Keep node',
            onConfirm: () => {
                GameState.buildings[id].count -= 1n;
                GameState.data += refund;
                addLog(`$ Sold ${b.name} for ${formatNumber(refund)}`, 'warning');
                updateDisplay(false);
                saveGame();
            }
        });
    }

    function buyUpgrade(id) {
        const u = UPGRADES.find(x => x.id === id);
        if (GameState.upgrades[id].purchased) return;
        const cost = calculateUpgradeCost(u);
        if (GameState.data < cost) { addLog(`$ ERROR: Insufficient data (need ${formatNumber(cost)})`, 'error'); return; }
        GameState.data -= cost;
        GameState.upgrades[id].purchased = true;
        addLog(`$ apt-get install ${u.name.toLowerCase().replace(/\s+/g,'-')} [INSTALLED]`, 'info');
        updateDisplay(false); saveGame();
    }

    function buyConsumable(id) {
        const c = CONSUMABLES.find(x => x.id === id);
        const cost = calculateConsumableCost(c);
        if (GameState.data < cost) { addLog(`$ ERROR: Insufficient data (need ${formatNumber(cost)})`, 'error'); return; }
        GameState.data -= cost;
        GameState.consumables[id].count += 1n;
        addLog(`$ Purchased ${c.name} [+1]`, 'info');
        updateDisplay(false); saveGame();
    }

    function useConsumable(id) {
        if (GameState.consumables[id].count <= 0n) { addLog(`$ ERROR: No ${id} available`, 'error'); return; }
        const c = CONSUMABLES.find(x => x.id === id);
        const mutatorId = GameState.contract.active?.mutator?.id;
        if (mutatorId === 'no_cooling' && ['cooldown_reduce','cool_down'].includes(c.effect)) {
            addLog(`$ Contract mutator blocks cooling items`, 'error');
            return;
        }
        GameState.consumables[id].count -= 1n;
        switch(c.effect) {
            case 'repair':
                if (GameState.systemMalfunction.active) {
                    GameState.systemMalfunction.active = false; GameState.systemMalfunction.severity = 0;
                    document.getElementById('malfunction-message').style.display = 'none';
                    document.getElementById('malfunction-container').style.display = 'none';
                    addLog(`$ System repaired [OK]`, 'success');
                } else { addLog(`$ No malfunction to repair [wasted]`, 'warning'); }
                break;
            case 'cooldown_reduce':
                if (GameState.skills.broadcastStorm.crashed) { GameState.skills.broadcastStorm.crashDuration = Math.max(5000, GameState.skills.broadcastStorm.crashDuration - c.value); addLog(`$ Coolant applied — recovery accelerated 4s`, 'success'); }
                else { addLog(`$ No crash active [wasted]`, 'warning'); }
                break;
            case 'cool_down':
                GameState.temperature.current = Math.max(GameState.temperature.target, GameState.temperature.current - c.value);
                GameState.temperature.qteActive = false; GameState.temperature.qteCooldown = 0;
                document.getElementById('command-line').classList.remove('qte-active');
                addLog(`$ AC repair — temperature -${c.value}°C`, 'success');
                break;
            case 'stability':
                if (GameState.skills.broadcastStorm.active) { GameState.skills.broadcastStorm.instability = Math.max(0, GameState.skills.broadcastStorm.instability - 50); addLog(`$ Stability patch — instability -50%`, 'success'); }
                else { addLog(`$ Broadcast Storm not active [wasted]`, 'warning'); }
                break;
            case 'boost':
                if (Date.now() < GameState.boosterCooldownUntil) { GameState.consumables[id].count += 1n; addLog(`$ Booster cooling down (${Math.ceil((GameState.boosterCooldownUntil-Date.now())/1000)}s)`, 'warning'); break; }
                GameState.consumables.bandwidth_boost.activeBoost = { endTime: Date.now() + 20000 };
                GameState.boosterCooldownUntil = Date.now() + 90000;
                addLog(`$ Bandwidth booster activated [x2 for 20s]`, 'warning');
                break;
            case 'shield': addLog(`$ Malfunction shield ready`, 'success'); break;
            case 'unlock_targets': addLog(`$ Corporate phone list acquired`, 'success'); break;
        }
        updateDisplay(false); saveGame();
    }

    function levelTalent(id, cost, max) {
        if (GameState.talents[id] >= max) return;
        if (getAvailableTalentPoints() < cost) { addLog(`$ Not enough talent points`, 'warning'); return; }
        GameState.talents[id]++;
        addLog(`$ Talent upgraded: ${id} → ${GameState.talents[id]}`, 'success');
        updateDisplay(false); saveGame();
    }

    function buyBlackMarketItem(id) {
        const item = BLACK_MARKET_ITEMS.find(i => i.id === id);
        if (GameState.blackMarket[id].purchased) return;
        const avOrder = ['antivirus_l1','antivirus_l2','antivirus_l3','antivirus_l4'];
        if (avOrder.includes(id)) {
            const idx = avOrder.indexOf(id);
            if (idx > 0 && !GameState.blackMarket[avOrder[idx-1]].purchased) { addLog(`$ ERROR: Install Antivirus L${idx} first`, 'error'); return; }
        }
        const cost = calculateBlackMarketCost(item);
        if (GameState.crypto < cost) { addLog(`$ ERROR: Need ${cost.toFixed(2)} XMR`, 'error'); return; }
        GameState.crypto -= cost;
        GameState.blackMarket[id].purchased = true;
        if (id === 'grid_hijack') GameState.energy.hackedGridBonus += 1800;
        if (id === 'diesel_backup') GameState.energy.backupGenerator = true;
        if (id === 'honeypot_core') GameState.honeypot.nextIntelAt = Date.now() + 300000;
        addLog(`$ Black Market acquired: ${item.name}`, 'warning');
        updateDisplay(false); saveGame();
    }

    function upgradeSkill(skillId) {
        const skill = GameState.skills[skillId];
        const nextLevel = skill.level + 1;
        if (nextLevel > skill.maxLevel) { addLog(`$ ERROR: ${skillId} max level`, 'error'); return; }
        const req = getSkillRequirement(skillId, nextLevel - 1);
        const bw = calculateTotalBandwidth();
        if (bw < req.bandwidth || GameState.totalPackets < req.packets || GameState.data < req.cost) { addLog(`$ ERROR: Requirements not met for ${skillId} L${nextLevel}`, 'error'); return; }
        GameState.data -= req.cost;
        skill.level = nextLevel;
        addLog(`$ ${skillId} upgraded to level ${nextLevel} [ENHANCED]`, 'success');
        updateDisplay(false); saveGame();
    }

    function activateDNSAmplification() {
        const s = GameState.skills.dnsAmplification;
        if (s.level === 0) { addLog(`$ ERROR: Unlock DNS Amplification first`, 'error'); return; }
        if (s.cooldown > 0) { addLog(`$ Cooling down (${Math.ceil(s.cooldown/1000)}s)`, 'warning'); return; }
        s.active = true;
        s.cooldown = s.baseCooldown - (s.level-1)*5000;
        addLog(`$ nslookup --amplify enabled [x${s.multiplier+(s.level-1)*20} BOOST]`, 'warning');
        setTimeout(() => { s.active = false; addLog(`$ DNS Amplification expired`, 'info'); updateDisplay(false); }, s.duration);
        updateDisplay(false);
    }

    function activateBroadcastStorm() {
        const s = GameState.skills.broadcastStorm;
        if (s.level === 0) { addLog(`$ ERROR: Unlock first`, 'error'); return; }
        if (s.crashed) { addLog(`$ ERROR: System recovering`, 'error'); return; }
        if (s.active) { addLog(`$ WARNING: Already active!`, 'warning'); return; }
        s.active = true;
        document.getElementById('instability-container').style.display = 'block';
        addLog(`$ ifconfig eth0 broadcast 255.255.255.255 [x${s.multiplier+(s.level-1)*5} BOOST — RISK MODE]`, 'error');
        updateDisplay(false);
    }

    function activatePacketInjection() {
        const s = GameState.skills.packetInjection;
        if (s.level === 0) { addLog(`$ ERROR: Unlock first`, 'error'); return; }
        if (s.cooldown > 0) { addLog(`$ Cooling down (${Math.ceil(s.cooldown/1000)}s)`, 'warning'); return; }
        s.active = true;
        s.cooldown = s.baseCooldown - (s.level-1)*5000;
        addLog(`$ tcpdump --inject [x${s.clickMultiplier+(s.level-1)*3} CLICK BOOST]`, 'warning');
        setTimeout(() => { s.active = false; addLog(`$ Packet Injection expired`, 'info'); updateDisplay(false); }, s.duration);
        updateDisplay(false);
    }

    // ================================================
    // GAME LOOP
    // ================================================
    function gameTick() {
        const now = Date.now();
        const dt = (now - GameState.lastTick) / 1000;
        GameState.lastTick = now;

        updateTemperature(dt);
        applyEnergyState();

        Object.values(GameState.skills).forEach(s => { if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt*1000); });

        if (GameState.consumables.bandwidth_boost.activeBoost && now >= GameState.consumables.bandwidth_boost.activeBoost.endTime) {
            GameState.consumables.bandwidth_boost.activeBoost = null;
            addLog(`$ Bandwidth booster expired`, 'info');
        }

        if (GameState.systemMalfunction.active) {
            const elapsed = now - GameState.systemMalfunction.startTime;
            document.getElementById('malfunction-fill').style.width = Math.min(100, (elapsed/60000)*100) + '%';
            if (elapsed >= 60000) {
                GameState.systemMalfunction.active = false; GameState.systemMalfunction.severity = 0;
                document.getElementById('malfunction-message').style.display = 'none';
                document.getElementById('malfunction-container').style.display = 'none';
                addLog(`$ System auto-recovery completed [OK]`, 'success');
            }
        }
        checkMalfunction(now);

        const activeMutatorId = GameState.contract.active?.mutator?.id;
        if (!GameState.rivalAttack.active && now >= GameState.rivalAttack.nextAttackCheck) {
            const rivalBoost = activeMutatorId === 'rival_x2' ? 2 : 1;
            if (Math.random() < Math.min(0.9, 0.32 * rivalBoost)) triggerRivalAttack();
            GameState.rivalAttack.nextAttackCheck = now + (activeMutatorId === 'rival_x2' ? 35000 : 70000) + Math.random()*90000;
        }
        if (GameState.rivalAttack.active && now >= GameState.rivalAttack.endTime) resolveRivalAttack(false);

        checkContractProgress();

        if (GameState.blackMarket.honeypot_core?.purchased && now >= GameState.honeypot.nextIntelAt) {
            const ip = `91.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
            GameState.knownAttackerIps = [...new Set([ip,...GameState.knownAttackerIps])].slice(0,20);
            GameState.honeypot.nextIntelAt = now + 300000;
            addLog(`$ Honeypot captured attacker intel: ${ip}`, 'info');
        }
        evaluateMaliciousFiles();

        if (!GameState.solarStorm.active && now >= GameState.solarStorm.nextCheck) {
            if (Math.random() < 0.2) triggerSolarStorm();
            GameState.solarStorm.nextCheck = now + 140000 + Math.random()*120000;
        }
        if (GameState.solarStorm.active && now >= GameState.solarStorm.endTime) {
            GameState.solarStorm.active = false;
            GameState.solarStorm.impactMode = 'production'; GameState.solarStorm.productionMultiplier = 0.7; GameState.solarStorm.wattsMultiplier = 1.25;
            document.getElementById('solar-indicator').style.display = 'none';
            addLog(`$ Solar storm dissipated`, 'info');
        }

        if (GameState.skills.broadcastStorm.crashed) {
            if (now - GameState.skills.broadcastStorm.crashTime >= GameState.skills.broadcastStorm.crashDuration) {
                GameState.skills.broadcastStorm.crashed = false;
                GameState.skills.broadcastStorm.instability = 0;
                GameState.skills.broadcastStorm.active = false;
                GameState.skills.broadcastStorm.crashDuration = 30000;
                document.getElementById('crash-message').style.display = 'none';
                document.getElementById('instability-container').style.display = 'none';
                addLog(`$ Network services restored [OK]`, 'success');
            }
        }
        if (GameState.skills.broadcastStorm.active && !GameState.skills.broadcastStorm.crashed) {
            const rate = Math.max(1, 8 - (GameState.skills.broadcastStorm.level-1)*1.5);
            GameState.skills.broadcastStorm.instability += dt * rate;
            if (GameState.skills.broadcastStorm.instability >= 100) {
                GameState.skills.broadcastStorm.crashed = true;
                GameState.skills.broadcastStorm.crashTime = now;
                GameState.skills.broadcastStorm.instability = 100;
                document.getElementById('crash-message').style.display = 'block';
                addLog(`$ CRITICAL: Network overload — SYSTEM CRASH`, 'error');
                GameState.contract.stats.crashes += 1n;
            }
        }

        if (!GameState.skills.broadcastStorm.crashed && !GameState.energy.blackout) {
            if (activeMutatorId === 'only_manual') {
                if (!GameState.guidance.passiveMutedLogged) {
                    addLog(`$ Mutator active: passive income disabled (manual ping only)`, 'warning');
                    GameState.guidance.passiveMutedLogged = true;
                }
            } else {
                GameState.guidance.passiveMutedLogged = false;
                const bw = calculateTotalBandwidth();
                const gain = BigInt(Math.floor(Number(bw) * dt));
                if (gain > 0n) {
                    if (GameState.miningMode === 'crypto') {
                        GameState.crypto += (Number(calculateMiningBandwidth())/24000) * getCryptoMultiplier() * dt;
                    } else {
                        GameState.data += gain;
                    }
                    let pp = BigInt(Math.floor(Number(gain)/300));
                    if (GameState.blackMarket.packet_compiler?.purchased) pp += BigInt(Math.floor(Number(gain)/180));
                    if (pp > 0n) { GameState.totalPackets += pp; GameState.packetsFromAutomation += pp; }
                }
            }
        }

        // Story unlocks
        if (GameState.totalPackets >= 25000n) unlockStoryLog('architect_note');
        if (GameState.crypto >= 8) unlockStoryLog('rival_manifest');
        if (GameState.contract.stats.crashes >= 2n) unlockStoryLog('blackout_protocol');

        checkAchievements();
        tickAmbientLogs(now);

        if (now - GameState.lastSave > 10000) saveGame();
        updateDisplay(false);
    }

    function getNextPrestigeObjective() {
        const ps = getPrestigeStatus();
        const next = ps.checks.find(c => !c.met);
        return next ? next.label : 'All prestige requirements met. Run prestige when ready.';
    }

    function getRecommendedPurchase() {
        let best = null;
        BUILDINGS.forEach(b => {
            const cost = calculateBuildingCost(b);
            const prod = calculateBuildingProduction(b);
            const roi = bigintToNumberSafe(cost) / Math.max(1, bigintToNumberSafe(prod));
            if (!best || roi < best.roi) best = { label: `${b.name} (ROI ~${roi.toFixed(1)}s)`, roi };
        });
        return best?.label || 'Keep scaling your infrastructure.';
    }

    function getRecommendedContract() {
        const bw = calculateTotalBandwidth();
        const available = CONTRACT_BOARD.filter(c => bw >= c.requirements.bandwidth && GameState.totalPackets >= c.requirements.packets);
        if (!available.length) return 'No contract ready yet. Push bandwidth + packets.';
        const target = available.sort((a,b) => (b.rewards.crypto + b.rewards.reputation) - (a.rewards.crypto + a.rewards.reputation))[0];
        return `${target.name} (${target.faction})`;
    }


    function getContractObjectivesSummary(contract) {
        return contract.stages.map((stage, idx) => {
            const labelMap = {
                data: `Collect ${formatNumber(stage.goal)} data`,
                packets: `Send ${stage.goal} packets`,
                crash: `Trigger ${stage.goal} crash(es)`,
                blackouts: `Trigger ${stage.goal} blackout(s)`,
                crypto: `Mine ${stage.goal.toFixed ? stage.goal.toFixed(2) : stage.goal} XMR`,
                bandwidth: `Reach ${formatNumber(stage.goal)} /s bandwidth`
            };
            return `${idx+1}. ${labelMap[stage.type] || stage.type}`;
        }).join('<br>');
    }

    function applyMissionSectionVisibility() {
        const obj = document.getElementById('mission-objective-wrap');
        const load = document.getElementById('mission-loadout-wrap');
        if (obj) obj.classList.toggle('collapsed', GameState.uiCollapsed.objective);
        if (load) load.classList.toggle('collapsed', GameState.uiCollapsed.loadout);
    }

    function toggleMissionSection(section) {
        if (!Object.prototype.hasOwnProperty.call(GameState.uiCollapsed, section)) return;
        GameState.uiCollapsed[section] = !GameState.uiCollapsed[section];
        applyMissionSectionVisibility();
        saveGame();
    }

    function renderMissionControl() {
        const panel = document.getElementById('objective-panel');
        if (!panel) return;
        const activeMutator = GameState.contract.active?.mutator?.name || 'None';
        panel.innerHTML = `
            <div class="objective-card"><div class="objective-label">Next prestige objective</div><div class="objective-value">${escapeHtml(getNextPrestigeObjective())}</div></div>
            <div class="objective-card"><div class="objective-label">Recommended purchase</div><div class="objective-value">${escapeHtml(getRecommendedPurchase())}</div></div>
            <div class="objective-card"><div class="objective-label">Recommended contract</div><div class="objective-value">${escapeHtml(getRecommendedContract())}</div></div>
            <div class="objective-card"><div class="objective-label">Run modifier</div><div class="objective-value">${escapeHtml(activeMutator)}</div></div>
        `;

        const loadout = document.getElementById('loadout-buttons');
        if (!loadout) return;
        loadout.innerHTML = '';
        GameState.commandLoadout.forEach((command, idx) => {
            const btn = document.createElement('button');
            btn.className = 'loadout-btn';
            btn.innerHTML = `<strong>F${idx+1}</strong><br><span>${escapeHtml(command || '(empty)')}</span>`;
            btn.onclick = () => {
                if (!command) return;
                executeCommand(command);
                commandHistory.push(command);
            };
            loadout.appendChild(btn);
        });
    }

    // ================================================
    // UI UPDATE
    // ================================================
    function updateDisplay(rebuildPanels = true) {
        document.getElementById('data-display').textContent = formatNumber(GameState.data);
        document.getElementById('bandwidth-display').textContent = formatNumber(calculateTotalBandwidth()) + '/s';
        document.getElementById('packets-display').textContent = GameState.totalPackets.toString();
        document.getElementById('crypto-display').textContent = GameState.crypto.toFixed(2) + ' XMR';
        document.getElementById('cores-display').textContent = GameState.processorCores.toString();
        document.getElementById('mode-display').textContent = GameState.miningMode.toUpperCase();
        document.getElementById('watts-display').textContent = `${GameState.energy.currentWatts} / ${GameState.energy.capacityWatts} W`;
        document.getElementById('uptime-display').textContent = formatTime(Math.floor((Date.now()-GameState.startTime)/1000));

        const td = document.getElementById('temp-display');
        const temp = Math.floor(GameState.temperature.current);
        td.textContent = temp + '°C';
        td.classList.toggle('critical', temp > 40);
        td.classList.toggle('warning', temp > 30 && temp <= 40);

        if (GameState.temperature.current > GameState.temperature.maxSafe) {
            const fill = document.getElementById('temperature-fill');
            fill.style.width = Math.min(100, ((GameState.temperature.current-18)/32)*100) + '%';
            fill.className = 'temperature-fill ' + (temp > 40 ? 'critical' : temp > 30 ? 'warning' : 'normal');
        }
        if (GameState.skills.broadcastStorm.active || GameState.skills.broadcastStorm.crashed) {
            document.getElementById('instability-fill').style.width = GameState.skills.broadcastStorm.instability + '%';
        }

        const contractSummary = document.getElementById('contract-summary');
        if (contractSummary) contractSummary.textContent = `Active: ${GameState.contract.active ? GameState.contract.active.name : 'none'} | GW ${GameState.factions.ghostwire.reputation}, BF ${GameState.factions.blackflag.reputation}, OC ${GameState.factions.overclock.reputation}`;
        renderMissionControl();
        applyMissionSectionVisibility();

        if (!rebuildPanels) {
            if (Date.now() - GameState.uiRender.lastPanelRender < 250) return;
            GameState.uiRender.lastPanelRender = Date.now();
        } else { GameState.uiRender.lastPanelRender = Date.now(); }

        // Buildings
        const bCont = document.getElementById('buildings-container');
        bCont.innerHTML = '';
        BUILDINGS.forEach(b => {
            const cost = calculateBuildingCost(b);
            const count = GameState.buildings[b.id].count;
            const prod = calculateBuildingProduction(b);
            const sell = calculateBuildingSellValue(b);
            const card = document.createElement('div');
            card.style.cssText = 'display:flex;gap:8px;';
            const buyBtn = document.createElement('button');
            buyBtn.className = 'action-btn';
            buyBtn.disabled = GameState.data < cost;
            buyBtn.onclick = () => buyBuilding(b.id);
            buyBtn.innerHTML = `<div class="btn-info"><span class="btn-name">${b.name}</span><span class="btn-count">[${count}]</span></div><div class="btn-cost">Cost: ${formatNumber(cost)}</div>${count > 0 ? `<div class="btn-production">+${formatNumber(prod)}/s</div>` : ''}`;
            const sellBtn = document.createElement('button');
            sellBtn.className = 'upgrade-btn';
            sellBtn.style.maxWidth = '90px';
            sellBtn.disabled = count <= 0n;
            sellBtn.onclick = () => sellBuilding(b.id);
            sellBtn.innerHTML = `SELL<div class="btn-cost">+${count > 0n ? formatNumber(sell) : '—'}</div>`;
            card.appendChild(buyBtn); card.appendChild(sellBtn);
            bCont.appendChild(card);
        });

        // Upgrades
        const uCont = document.getElementById('upgrades-container');
        uCont.innerHTML = '';
        UPGRADES.forEach(u => {
            const purchased = GameState.upgrades[u.id].purchased;
            const cost = calculateUpgradeCost(u);
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.disabled = purchased || GameState.data < cost;
            btn.onclick = () => buyUpgrade(u.id);
            btn.innerHTML = `<div class="btn-info"><span class="btn-name">${u.name}</span>${purchased?'<span class="btn-count">[✓]</span>':''}</div>${!purchased?`<div class="btn-cost">Cost: ${formatNumber(cost)}</div>`:''}<div style="color:#666;font-size:11px;margin-top:2px;">${u.description}</div>`;
            uCont.appendChild(btn);
        });

        // Consumables
        const cCont = document.getElementById('consumables-container');
        cCont.innerHTML = '';
        CONSUMABLES.forEach(c => {
            const count = GameState.consumables[c.id].count;
            const cost = calculateConsumableCost(c);
            const btn = document.createElement('button');
            btn.className = 'consumable-btn';
            btn.disabled = GameState.data < cost;
            btn.onclick = () => buyConsumable(c.id);
            btn.innerHTML = `<div class="btn-info"><span class="btn-name">${c.name}</span><span class="btn-count">[${count}]</span></div><div class="btn-cost">Cost: ${formatNumber(cost)}</div><div style="color:#666;font-size:11px;margin-top:2px;">${c.description}</div>${count > 0 && c.effect !== 'unlock_targets' ? `<button onclick="event.stopPropagation();useConsumable('${c.id}')" style="margin-top:4px;padding:4px 8px;background:#2a2a2a;border:1px solid #4488ff;color:#4488ff;border-radius:2px;cursor:pointer;font-size:11px;">USE</button>` : ''}`;
            cCont.appendChild(btn);
        });

        // Social
        const tCont = document.getElementById('targets-container');
        tCont.innerHTML = '';
        const listsOwned = GameState.consumables.phone_list.count;
        if (listsOwned === 0n) {
            const info = document.createElement('div');
            info.style.cssText = 'color:#666;padding:12px;';
            info.textContent = 'Tip: the first target is available without a phone list. Buy Corporate Phone List to unlock harder targets.';
            tCont.appendChild(info);
        }
        SOCIAL_TARGETS.forEach(t => {
            const compromised = GameState.targets[t.id].compromised;
            const hasAccess = listsOwned >= BigInt(t.requiredLists);
            const btn = document.createElement('button');
            btn.className = `target-btn${compromised?' compromised':''}`;
            btn.disabled = !hasAccess || compromised;
            btn.onclick = () => showDialog(t.id);
            btn.innerHTML = `<div class="btn-info"><span class="btn-name">${t.name}</span><span class="btn-count">[${t.difficulty.toUpperCase()}]</span></div>${compromised?`<div style="color:#00ff00;font-size:11px;">✓ COMPROMISED — +${Math.floor(t.permanentBonus*100)}% passive</div>`:`<div style="color:#666;font-size:11px;margin-top:2px;">Reward: ${formatNumber(t.baseReward)} +${Math.floor(t.permanentBonus*100)}% perm</div><div style="color:${hasAccess?'#00aa00':'#442222'};font-size:11px;">Requires: ${t.requiredLists} list(s) ${hasAccess?'✓':'✗'}</div>`}`;
            tCont.appendChild(btn);
        });

        // Skills
        const sCont = document.getElementById('skills-container');
        sCont.innerHTML = '';
        const bw = calculateTotalBandwidth();
        [
            { id: 'dnsAmplification', name: 'DNS Amplification', activate: activateDNSAmplification, desc: lvl => `x${50+(lvl-1)*20} production for 10s` },
            { id: 'broadcastStorm', name: 'Broadcast Storm', activate: activateBroadcastStorm, desc: lvl => `x${10+(lvl-1)*5} production (crash risk)` },
            { id: 'packetInjection', name: 'Packet Injection', activate: activatePacketInjection, desc: lvl => `x${5+(lvl-1)*3} click gain for 15s` }
        ].forEach(sk => {
            const skill = GameState.skills[sk.id];
            const nextLvl = skill.level + 1;
            const req = skill.level < skill.maxLevel ? getSkillRequirement(sk.id, nextLvl-1) : null;
            const btn = document.createElement('button');
            btn.className = `skill-btn${skill.level > 0 ? ' unlocked' : ''}`;
            btn.disabled = skill.crashed || (sk.id !== 'broadcastStorm' && skill.cooldown > 0);
            btn.onclick = skill.level > 0 ? sk.activate : () => upgradeSkill(sk.id);
            let html = `<div class="skill-level">LVL ${skill.level}/${skill.maxLevel}</div><div class="btn-info"><span class="btn-name">${sk.name}</span></div><div style="color:#ff6666;font-size:11px;margin-top:2px;">${skill.level > 0 ? sk.desc(skill.level) : 'LOCKED'}</div>`;
            if (req) {
                const bwMet = bw >= req.bandwidth, pkMet = GameState.totalPackets >= req.packets, cMet = GameState.data >= req.cost;
                html += `<div class="requirement-text ${bwMet?'requirement-met':'requirement-not-met'}">BW: ${formatNumber(bw)}/${formatNumber(req.bandwidth)}</div><div class="requirement-text ${pkMet?'requirement-met':'requirement-not-met'}">Packets: ${GameState.totalPackets}/${req.packets}</div>${req.cost > 0n?`<div class="requirement-text ${cMet?'requirement-met':'requirement-not-met'}">Cost: ${formatNumber(req.cost)}</div>`:''}<button onclick="event.stopPropagation();upgradeSkill('${sk.id}')" ${!bwMet||!pkMet||!cMet?'disabled':''} style="margin-top:4px;padding:4px 8px;background:#2a2a2a;border:1px solid #ffaa00;color:#ffaa00;border-radius:2px;cursor:pointer;font-size:11px;">UPGRADE</button>`;
            }
            if (sk.id !== 'broadcastStorm' && skill.cooldown > 0) html += `<div style="color:#888;font-size:11px;">Cooldown: ${Math.ceil(skill.cooldown/1000)}s</div>`;
            if (skill.crashed) html += `<div style="color:#ff4444;font-size:11px;">Recovery in progress...</div>`;
            btn.innerHTML = html;
            sCont.appendChild(btn);
        });

        // Talents
        const talCont = document.getElementById('talents-container');
        talCont.innerHTML = '';
        const pts = getAvailableTalentPoints();
        const pInfo = document.createElement('div');
        pInfo.style.cssText = 'color:#ffaa00;padding:8px 0;';
        pInfo.textContent = `Available talent points: ${pts} | Earn more by prestiging (processor cores).`;
        talCont.appendChild(pInfo);
        Object.entries(TALENT_TREE).forEach(([branch, talents]) => {
            talents.forEach(t => {
                const current = GameState.talents[t.id];
                const btn = document.createElement('button');
                btn.className = 'upgrade-btn';
                btn.disabled = current >= t.max || pts < t.cost;
                btn.onclick = () => levelTalent(t.id, t.cost, t.max);
                btn.innerHTML = `<div class="btn-info"><span class="btn-name">${branch.toUpperCase()} :: ${t.name}</span><span class="btn-count">[${current}/${t.max}]</span></div><div style="color:#666;font-size:11px;">${t.desc}</div>`;
                talCont.appendChild(btn);
            });
        });

        // Matrix (si actif)
        if (document.getElementById('tab-matrix').classList.contains('active')) {
            renderMatrixContacts();
            renderMatrixMessages();
        }
    }

    // ================================================
    // SAVE / LOAD
    // ================================================
    function saveGame() {
        const d = {
            data: GameState.data.toString(), totalPackets: GameState.totalPackets.toString(),
            startTime: GameState.startTime, lastSave: Date.now(),
            temperature: { current: GameState.temperature.current, target: GameState.temperature.target },
            buildings: {}, upgrades: {}, consumables: {}, targets: {},
            skills: { dnsAmplification: { level: GameState.skills.dnsAmplification.level }, broadcastStorm: { level: GameState.skills.broadcastStorm.level }, packetInjection: { level: GameState.skills.packetInjection.level } },
            uiTheme: GameState.uiTheme, miningMode: GameState.miningMode, crypto: GameState.crypto,
            processorCores: GameState.processorCores.toString(), blackMarket: GameState.blackMarket,
            contractStats: { crashes: GameState.contract.stats.crashes.toString(), blackouts: GameState.contract.stats.blackouts.toString(), completed: GameState.contract.stats.completed.toString() },
            packetsFromAutomation: GameState.packetsFromAutomation.toString(), boosterCooldownUntil: GameState.boosterCooldownUntil,
            storyUnlocked: GameState.story.unlocked, talents: GameState.talents, factions: GameState.factions,
            energy: { hackedGridBonus: GameState.energy.hackedGridBonus, backupGenerator: GameState.energy.backupGenerator },
            files: GameState.files.filter(f => f.type === 'malicious'),
            solarStorm: { count: GameState.solarStorm.count || 0 },
            knownAttackerIps: GameState.knownAttackerIps, honeypot: GameState.honeypot,
            matrix: { conversations: GameState.matrix.conversations, unread: GameState.matrix.unread, activeContact: GameState.matrix.activeContact },
            achievementsUnlocked: GameState.achievementsUnlocked || [],
            achievementFlags: GameState._achievementFlags || {},
            commandLoadout: GameState.commandLoadout,
            analytics: GameState.analytics,
            uiCollapsed: GameState.uiCollapsed,
            commandHistory: commandHistory.slice(-100)
        };
        Object.keys(GameState.buildings).forEach(k => d.buildings[k] = GameState.buildings[k].count.toString());
        Object.keys(GameState.upgrades).forEach(k => d.upgrades[k] = GameState.upgrades[k].purchased);
        Object.keys(GameState.consumables).forEach(k => d.consumables[k] = GameState.consumables[k].count.toString());
        Object.keys(GameState.targets).forEach(k => d.targets[k] = GameState.targets[k].compromised);
        localStorage.setItem('swamped_save_v5', JSON.stringify(d));
        GameState.lastSave = Date.now();
    }

    function loadGame() {
        const raw = localStorage.getItem('swamped_save_v5') || localStorage.getItem('swamped_save');
        if (!raw) return false;
        try {
            const d = JSON.parse(raw);
            GameState.data = BigInt(d.data || '0');
            GameState.totalPackets = BigInt(d.totalPackets || '0');
            GameState.startTime = d.startTime || Date.now();
            if (d.temperature) { GameState.temperature.current = d.temperature.current; GameState.temperature.target = d.temperature.target; }
            Object.keys(d.buildings || {}).forEach(k => { if (GameState.buildings[k]) GameState.buildings[k].count = BigInt(d.buildings[k]); });
            Object.keys(d.upgrades || {}).forEach(k => { if (GameState.upgrades[k]) GameState.upgrades[k].purchased = d.upgrades[k]; });
            Object.keys(d.consumables || {}).forEach(k => { if (GameState.consumables[k]) GameState.consumables[k].count = BigInt(d.consumables[k]); });
            Object.keys(d.targets || {}).forEach(k => { if (GameState.targets[k]) GameState.targets[k].compromised = d.targets[k]; });
            if (d.skills) {
                if (d.skills.dnsAmplification) GameState.skills.dnsAmplification.level = d.skills.dnsAmplification.level;
                if (d.skills.broadcastStorm) GameState.skills.broadcastStorm.level = d.skills.broadcastStorm.level;
                if (d.skills.packetInjection) GameState.skills.packetInjection.level = d.skills.packetInjection.level;
            }
            if (d.miningMode) GameState.miningMode = d.miningMode;
            if (typeof d.crypto === 'number') GameState.crypto = d.crypto;
            if (d.processorCores) GameState.processorCores = BigInt(d.processorCores);
            if (d.blackMarket) Object.keys(d.blackMarket).forEach(k => { if (GameState.blackMarket[k]) GameState.blackMarket[k].purchased = d.blackMarket[k].purchased; });
            if (d.contractStats) {
                GameState.contract.stats.crashes = BigInt(d.contractStats.crashes || '0');
                GameState.contract.stats.blackouts = BigInt(d.contractStats.blackouts || '0');
                GameState.contract.stats.completed = BigInt(d.contractStats.completed || '0');
            }
            if (d.packetsFromAutomation) GameState.packetsFromAutomation = BigInt(d.packetsFromAutomation);
            if (d.boosterCooldownUntil) GameState.boosterCooldownUntil = d.boosterCooldownUntil;
            if (Array.isArray(d.storyUnlocked)) GameState.story.unlocked = d.storyUnlocked.filter(k => STORY_LOGS[k]);
            if (d.talents) Object.keys(GameState.talents).forEach(k => { if (typeof d.talents[k] === 'number') GameState.talents[k] = d.talents[k]; });
            if (d.factions) Object.keys(GameState.factions).forEach(k => { if (d.factions[k]?.reputation !== undefined) GameState.factions[k].reputation = d.factions[k].reputation; });
            if (d.energy) { GameState.energy.hackedGridBonus = d.energy.hackedGridBonus || 0; GameState.energy.backupGenerator = d.energy.backupGenerator || false; }
            if (Array.isArray(d.files)) GameState.files = d.files;
            if (d.solarStorm) GameState.solarStorm.count = d.solarStorm.count || 0;
            if (Array.isArray(d.knownAttackerIps)) GameState.knownAttackerIps = d.knownAttackerIps;
            if (d.honeypot) GameState.honeypot = { ...GameState.honeypot, ...d.honeypot };
            if (d.matrix) {
                if (d.matrix.conversations) GameState.matrix.conversations = d.matrix.conversations;
                if (d.matrix.unread) GameState.matrix.unread = d.matrix.unread;
                if (d.matrix.activeContact) GameState.matrix.activeContact = d.matrix.activeContact;
            }
            if (Array.isArray(d.achievementsUnlocked)) GameState.achievementsUnlocked = d.achievementsUnlocked;
            if (d.achievementFlags) GameState._achievementFlags = d.achievementFlags;
            if (Array.isArray(d.commandLoadout)) GameState.commandLoadout = d.commandLoadout.slice(0,3);
            if (d.analytics) {
                if (typeof d.analytics.contractFailed === 'number') GameState.analytics.contractFailed = d.analytics.contractFailed;
                if (typeof d.analytics.contractCompleted === 'number') GameState.analytics.contractCompleted = d.analytics.contractCompleted;
                if (typeof d.analytics.firstPrestigeAt === 'number') GameState.analytics.firstPrestigeAt = d.analytics.firstPrestigeAt;
            }
            if (d.uiCollapsed) {
                if (typeof d.uiCollapsed.objective === 'boolean') GameState.uiCollapsed.objective = d.uiCollapsed.objective;
                if (typeof d.uiCollapsed.loadout === 'boolean') GameState.uiCollapsed.loadout = d.uiCollapsed.loadout;
            }
            if (Array.isArray(d.commandHistory)) {
                commandHistory.splice(0, commandHistory.length, ...d.commandHistory.slice(-100));
            }
            refreshSystemFiles();
            applyTheme(d.uiTheme || localStorage.getItem('swamped_theme') || 'default', false);
            // Offline gains
            const offline = (Date.now() - (d.lastSave || Date.now())) / 1000;
            if (offline > 5 && GameState.miningMode !== 'crypto') {
                const gain = BigInt(Math.floor(Number(calculateTotalBandwidth()) * offline));
                if (gain > 0n) { GameState.data += gain; addLog(`$ Offline: +${formatNumber(gain)} collected (${Math.floor(offline)}s)`, 'success'); }
            }
            return true;
        } catch(e) { console.error('Load failed:', e); return false; }
    }

    // ================================================
    // COMMANDS
    // ================================================
    const commandHistory = [];
    let historyIndex = -1;

    function getSupportedCommands() {
        return ['ping','help','stats','temp','save','clear','reset','theme','mine','prestige','contract','contracts','market','map','talents','story','history','loadout','ls','rm','hireintel','counter','firewall','traceback','null_route','aide',...GameState.temperature.qteCommands];
    }

    function autocompleteCommand(input) {
        const value = input.value.trim().toLowerCase();
        if (!value) return;
        const matches = getSupportedCommands().filter(c => c.startsWith(value));
        if (matches.length === 1) input.value = matches[0];
        else if (matches.length > 1) addLog(`$ Suggestions: ${matches.join(', ')}`, 'info');
    }

    function navigateHistory(dir, input) {
        if (!commandHistory.length) return;
        historyIndex = dir === 'up' ? Math.min(commandHistory.length-1, historyIndex+1) : Math.max(-1, historyIndex-1);
        input.value = historyIndex === -1 ? '' : commandHistory[commandHistory.length-1-historyIndex];
        input.setSelectionRange(input.value.length, input.value.length);
    }

    function executeCommand(cmd) {
        const command = cmd.trim().toLowerCase();
        if (!command) return;
        if (handleTemperatureQTE(command)) return;
        if (GameState.rivalAttack.active && ['firewall','traceback','null_route'].includes(command)) {
            resolveRivalAttack(command === GameState.rivalAttack.expectedCommand);
            return;
        }
        addLog(`$ ${cmd}`, 'info');
        const [base, ...args] = command.split(/\s+/);
        const arg = args[0];
        const commands = {
            ping: () => {
                let n = 1;
                if (arg !== undefined) { const p = parseInt(arg,10); if (isNaN(p)||p<1){addLog(`$ ERROR: usage ping [count] (1-50)`,'error');return;} n=Math.min(50,p); }
                addLog(`PING 8.8.8.8 (8.8.8.8) ${n} packet(s).`,'success');
                generatePacket(n);
            },
            help: () => {
                ['Available commands:','  ping [n]       — generate data packets (1-50)','  loadout list|set <1-3> <cmd>|run <1-3>','  theme [name]   — switch theme (default/mono/pink/amber)','  mine [data|crypto] — toggle mining mode','  prestige       — reboot for permanent cores (3/5 objectives)','  contract       — open contract board','  market         — open black market','  map            — ASCII world map','  talents        — show talent points','  story [id]     — read narrative files','  ls             — list files','  rm <file>      — remove file','  hireintel      — buy attacker intel','  counter <ip>   — counter attack','  stats          — statistics','  temp           — temperature status','  save / clear / reset','  [Tab] — autocomplete | [↑↓] — history'].forEach(l => addLog(l,'info'));
            },
            aide: () => commands.help(),
            stats: () => {
                const ps = getPrestigeStatus();
                [`=== System Statistics ===`,`Data: ${formatNumber(GameState.data)}`,`Bandwidth: ${formatNumber(calculateTotalBandwidth())}/s`,`Packets: ${GameState.totalPackets}`,`Temp: ${Math.floor(GameState.temperature.current)}°C`,`Uptime: ${formatTime(Math.floor((Date.now()-GameState.startTime)/1000))}`,`Skills: DNS L${GameState.skills.dnsAmplification.level}, Storm L${GameState.skills.broadcastStorm.level}, Inject L${GameState.skills.packetInjection.level}`,`Compromised: ${Object.values(GameState.targets).filter(t=>t.compromised).length}/${SOCIAL_TARGETS.length}`,`Crypto: ${GameState.crypto.toFixed(2)} XMR | Cores: ${GameState.processorCores}`,`Mining: ${GameState.miningMode.toUpperCase()}`,`Contract: ${GameState.contract.active?GameState.contract.active.name:'none'}`,`Power: ${GameState.energy.currentWatts}/${GameState.energy.capacityWatts}W`,`Factions: GW ${GameState.factions.ghostwire.reputation}, BF ${GameState.factions.blackflag.reputation}, OC ${GameState.factions.overclock.reputation}`,`Prestige: ${ps.completed}/${ps.needed} objectives`,`Achievements: ${GameState.achievementsUnlocked.length}/${ACHIEVEMENTS.length}`,`Files: ${GameState.files.length} (${GameState.files.filter(f=>f.type==='malicious').length} malicious)`,`AV level: L${getAntivirusLevel()}`,`Analytics: contract fail ${GameState.analytics.contractFailed} | complete ${GameState.analytics.contractCompleted}`].forEach(l => addLog(l, l.includes('===') ? 'warning' : 'info'));
            },
            temp: () => {
                const t = Math.floor(GameState.temperature.current);
                addLog(`Temperature: ${t}°C`, t>30?'warning':'success');
                if (GameState.temperature.productionPenalty > 0) addLog(`Production penalty: -${Math.floor(GameState.temperature.productionPenalty*100)}%`,'error');
                else addLog(`Temperature within safe limits`,'success');
            },
            theme: () => {
                if (!arg) { addLog(`Current theme: ${GameState.uiTheme}`,'info'); return; }
                if (arg === 'list') { addLog(`Themes: default, mono, pink, amber`,'info'); return; }
                if (!['default','mono','pink','amber'].includes(arg)) { addLog(`Unknown theme '${arg}'`,'error'); return; }
                addLog(`Theme switched to ${applyTheme(arg)}`,'success');
            },
            mine: () => {
                if (!arg || !['data','crypto'].includes(arg)) { addLog(`Usage: mine data|crypto`,'warning'); return; }
                GameState.miningMode = arg;
                addLog(`Mining mode: ${arg.toUpperCase()}`,'success'); updateDisplay(false);
            },
            prestige: () => {
                const ps = getPrestigeStatus();
                if (!ps.eligible) {
                    addLog(`$ Prestige locked: ${ps.completed}/${ps.needed} requirements met`,'error');
                    ps.checks.forEach((c,i) => addLog(`  [${c.met?'x':' '}] ${i+1}. ${c.label}`, c.met?'success':'warning'));
                    return;
                }
                if (!confirm('FORMAT COMPLETE — ROOTKIT INSTALL? Resets progress for permanent cores.')) { addLog(`$ Prestige aborted`,'warning'); return; }
                performPrestige();
            },
            contract: () => openContractBoard(),
            contracts: () => openContractBoard(),
            market: () => openBlackMarketBoard(),
            map: () => openWorldMap(),
            talents: () => addLog(`Talent points: ${getAvailableTalentPoints()} (earn via prestige)`,'info'),
            story: () => {
                if (!arg) { addLog(`Unlocked: ${GameState.story.unlocked.join(', ')}`,'info'); addLog(`Usage: story <id>`,'info'); return; }
                if (!GameState.story.unlocked.includes(arg) || !STORY_LOGS[arg]) { addLog(`Unknown or locked: ${arg}`,'error'); return; }
                const entry = STORY_LOGS[arg];
                addLog(`>>> ${entry.title} <<<`,'warning');
                addLog(entry.text,'info');
            },
            ls: () => {
                refreshSystemFiles();
                if (!GameState.files.length) { addLog(`(empty directory)`,'info'); return; }
                GameState.files.forEach(f => addLog(f.name, f.type==='malicious'?'error':'info'));
            },
            hireintel: () => {
                let cost = 6;
                if (GameState.blackMarket.market_snitch?.purchased) cost *= 0.75;
                if (GameState.crypto < cost) { addLog(`Need ${cost.toFixed(2)} XMR`,'error'); return; }
                GameState.crypto -= cost;
                const ip = `203.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
                GameState.knownAttackerIps = [...new Set([ip,...GameState.knownAttackerIps])].slice(0,20);
                addLog(`$ Broker: attacker IP ${ip}`,'success');
            },
            counter: () => {
                if (!arg) { addLog(`Usage: counter <ip>`,'warning'); return; }
                if (!GameState.knownAttackerIps.includes(arg)) { addLog(`Unknown attacker IP`,'error'); return; }
                if (Math.random() < 0.45) { GameState.buildings.dedicated_server.count += 1n; addLog(`Counter attack success: +1 Dedicated Server`,'success'); }
                else { const loss = BigInt(Math.floor(Number(GameState.data)*0.08)); GameState.data = GameState.data>loss?GameState.data-loss:0n; addLog(`Counter failed: -${formatNumber(loss)}`,'error'); }
            },
            rm: () => {
                if (!arg) { addLog(`Usage: rm <filename>`,'warning'); return; }
                const idx = GameState.files.findIndex(f => f.name === arg);
                if (idx === -1) { addLog(`rm: cannot remove '${arg}': No such file`,'error'); return; }
                if (GameState.files[idx].name.startsWith('corporate_phone_list_')) { addLog(`Protected file`,'warning'); return; }
                GameState.files.splice(idx,1);
                addLog(`removed ${arg}`,'success');
            },
            history: () => {
                if (!commandHistory.length) { addLog(`No history`,'info'); return; }
                commandHistory.slice(-12).forEach((c,i) => addLog(`${i+1}. ${c}`,'info'));
            },
            loadout: () => {
                const sub = args[0];
                if (!sub || sub === 'list') {
                    GameState.commandLoadout.forEach((c, i) => addLog(`F${i+1}: ${c || '(empty)'}`, 'info'));
                    return;
                }
                if (sub === 'run') {
                    const slot = Math.max(1, Math.min(3, parseInt(args[1], 10) || 0));
                    const cmdValue = GameState.commandLoadout[slot - 1];
                    if (!cmdValue) { addLog(`Empty loadout slot F${slot}`, 'warning'); return; }
                    executeCommand(cmdValue);
                    commandHistory.push(cmdValue);
                    return;
                }
                if (sub === 'set') {
                    const slot = Math.max(1, Math.min(3, parseInt(args[1], 10) || 0));
                    const cmdValue = args.slice(2).join(' ').trim();
                    if (!slot || !cmdValue) { addLog(`Usage: loadout set <1-3> <command>`, 'warning'); return; }
                    GameState.commandLoadout[slot - 1] = cmdValue;
                    addLog(`Loadout F${slot} set to: ${cmdValue}`, 'success');
                    updateDisplay(false);
                    saveGame();
                    return;
                }
                addLog(`Usage: loadout list|set <1-3> <command>|run <1-3>`, 'warning');
            },
            save: () => { saveGame(); addLog(`Game saved`,'success'); },
            clear: () => { document.getElementById('logs').replaceChildren(); },
            reset: () => { if (confirm('Reset all progress?')) { localStorage.removeItem('swamped_save_v5'); localStorage.removeItem('swamped_save'); location.reload(); } }
        };
        if (commands[base]) commands[base]();
        else addLog(`bash: ${command}: command not found`,'error');
    }

    // ================================================
    // EVENT LISTENERS
    // ================================================
    document.getElementById('clickable-area').addEventListener('click', () => generatePacket(1));
    document.getElementById('command-input').addEventListener('keydown', e => {
        const input = e.target;
        if (e.key === 'Enter') { const v = input.value; executeCommand(v); if (v.trim()) { commandHistory.push(v.trim()); if (commandHistory.length > 100) commandHistory.shift(); } historyIndex = -1; input.value = ''; return; }
        if (e.key === 'Tab') { e.preventDefault(); autocompleteCommand(input); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); navigateHistory('up', input); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); navigateHistory('down', input); }
    });
    document.getElementById('matrix-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMatrixMessage(); });
    document.getElementById('dialog-overlay').addEventListener('click', e => {
        if (e.target.id === 'dialog-overlay') closeDialog();
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'matrix') {
                GameState.matrix.unread[GameState.matrix.activeContact] = 0;
                renderMatrixContacts();
                renderMatrixMessages();
                updateMatrixTabBadge();
            }
        });
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('dialog-overlay').classList.contains('active')) {
            closeDialog();
            return;
        }
        if (['F1','F2','F3'].includes(e.key)) {
            e.preventDefault();
            const slot = Number(e.key.slice(1));
            const cmdValue = GameState.commandLoadout[slot-1];
            if (cmdValue) { executeCommand(cmdValue); commandHistory.push(cmdValue); }
            return;
        }
        if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
            const tabs = document.querySelectorAll('.tab-btn');
            const idx = parseInt(e.key) - 1;
            if (tabs[idx]) tabs[idx].click();
        }
    });

    // ================================================
    // GAME LOOP
    // ================================================
    let loopAccumulator = 0;
    let lastFrameTime = null;
    const TICK_MS = 100;

    function frame(now) {
        if (lastFrameTime === null) lastFrameTime = now;
        const delta = Math.min(250, now - lastFrameTime);
        lastFrameTime = now;
        loopAccumulator += delta;
        while (loopAccumulator >= TICK_MS) {
            gameTick();
            loopAccumulator -= TICK_MS;
        }
        requestAnimationFrame(frame);
    }

    function startGameLoop() {
        requestAnimationFrame(frame);
    }

    // ================================================
    // INIT
    // ================================================
    function init() {
        const loaded = loadGame();
        // If no existing matrix conversations, init them
        const hasConvs = Object.values(GameState.matrix.conversations).some(c => c.length > 0);
        if (!hasConvs) initMatrix();

        if (loaded) addLog(`$ Previous session restored`, 'success');
        else applyTheme(localStorage.getItem('swamped_theme') || 'default', false);

        updateDisplay(false);
        renderMatrixContacts();
        renderMatrixMessages();
        updateMatrixTabBadge();
        refreshSystemFiles();
        startGameLoop();
        addLog(`$ SWAMPED v5.0 — Michel online | Ctrl+1-9 tabs`, 'success');
        addLog(`$ ${ACHIEVEMENTS.length} achievements tracked | Matrix unlocked`, 'info');
    }

    init();
    
