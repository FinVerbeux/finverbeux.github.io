// config.js - La liste de tes outils
const siteConfig = {
    title: "TSN.RED TOOLS",
    subtitle: "Boîte à outils développeur & data",
    author: "FinVerbeux",
    portfolio: "https://portfolio-58.tsn.red/",
    
    // Ajoute tes outils ici. 
    // Format: { titre, description, lien, icone (FontAwesome), externe (true/false) }
    tools: [
        { 
            title: "Mon Portfolio", 
            desc: "Accéder à mon site principal tsn.red", 
            url: "https://tsn.red", 
            icon: "fa-solid fa-globe", 
            external: true,
            highlight: true 
        },
        { 
            title: "Dédoublonneur", 
            desc: "Nettoyer des listes et supprimer les doublons", 
            url: "dedoublonneur.html", 
            icon: "fa-solid fa-filter" 
        },
        { 
            title: "Pass Generator V2", 
            desc: "Créer des mots de passe robustes et sécurisés", 
            url: "password.html", 
            icon: "fa-solid fa-key" 
        },
        { 
            title: "JSON Formatter", 
            desc: "Valider et embellir du code JSON", 
            url: "json.html", 
            icon: "fa-solid fa-code" 
        },
        { 
            title: "Text Tools", 
            desc: "Majuscules, minuscules, compteur de mots", 
            url: "text-tools.html", 
            icon: "fa-solid fa-font" 
        },
        { 
            title: "URL Parser", 
            desc: "Analyse, modifie et reconstruit les paramètres d’URL", 
            url: "url-parser.html", 
            icon: "fa-solid fa-link" 
        },
        { 
            title: "Metadata Viewer", 
            desc: "Analyse et édite les métadonnées d’une image", 
            url: "metadata-tool.html",
            icon: "fa-solid fa-image"
        },
        { 
            title: "URL Steganography Tool", 
            desc: "Cache ou récupère des messages dans PNG/BMP", 
            url: "steganography.html", 
            icon: "fa-solid fa-user-secret" 
        },
        { 
            title: "QR Code", 
            desc: "Générer un QR Code pour partager un lien", 
            url: "qrcode.html", 
            icon: "fa-solid fa-qrcode" 
        }
    ]

};
