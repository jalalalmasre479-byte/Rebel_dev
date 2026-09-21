// © 2026 Q3yb - Wick studio.
// Protecting innovation, enabling creation. All rights reserved.
// Unauthorized access, reproduction, or distribution is strictly forbidden.
// This software is provided for private, individual use only.
// --------------------------------------------

module.exports = {
  "images": {
    "logo": "../../img/bank/logo.png",
    "visa": "../../img/bank/visa.png",
    "arrowUp": "../../img/bank/up.png",
    "arrowDown": "../../img/bank/down.png",
    "botAvatar": "../../img/bank/dice/bot.png",
    "landBase": "../../img/bank/land/land-base.png",
    "materials": {
      "wood": "../../img/bank/market/wood.png",
      "brick": "../../img/bank/market/brick.png",
      "stone": "../../img/bank/market/stone.png",
      "iron": "../../img/bank/market/iron.png",
      "steel": "../../img/bank/market/steel.png",
      "gold": "../../img/bank/market/gold.png"
    },
    "dice": {
      "1": "../../img/bank/dice/1.png",
      "2": "../../img/bank/dice/2.png",
      "3": "../../img/bank/dice/3.png",
      "4": "../../img/bank/dice/4.png",
      "5": "../../img/bank/dice/5.png",
      "6": "../../img/bank/dice/6.png"
    },
    "emojis": {
      "win": "../../img/bank/dice/win.png",
      "lose": "../../img/bank/dice/lose.png",
      "tie": "../../img/bank/dice/lose.png"
    },
          "gamble": {
            "fruits": {        "cherry": "../../img/bank/gamble/cherry.png",
        "grapes": "../../img/bank/gamble/grapes.png",
        "apple": "../../img/bank/gamble/apple.png",
        "orange": "../../img/bank/gamble/orange.png",
        "tomato": "../../img/bank/gamble/tomato.png",
        "lemon": "../../img/bank/gamble/lemon.png",
        "diamond": "../../img/bank/gamble/diamond.png"
      }
    }
  },
  "colors": {
    "bgTop": "#E8D8C8",
    "bgBottom": "#D9C7B6",
    "border": "#C9B39F",
    "line": "rgba(255, 80, 80, 0.15)",
    "text": "#FFECEC",
    "textMuted": "rgba(255, 200, 200, 0.6)",
    "green": "#4CD964",
    "red": "#FF2B2B",
    "cardBorder": "#D4BFAE",
    "iconBg": "#F2E4D8",
    "logoBg": "#F0B429",
    "logoAccent": "#111111"
  },
  "profile": {
  "canvas": {
    "width": 800,
    "height": 340
  },
  "padding": 20,
  "radius": 35,
  "header": {
    "y": 60,
    "lineY": 90,
    "logo": { "x": 60, "y": 60, "size": 40 },
    "text": { "x": 115, "y": 60, "fontSize": 28 },
    "menu": { "x": 720, "y": 53, "width": 32, "height": 4, "gap": 10 }
  },
  "avatar": {
    "x": 330,
    "y": 114,
    "radius": 20
  },
  "username": {
    "x": 400,
    "y": 115,
    "fontSize": 24
  },
  "level": {
    "x": 400,
    "y": 142,
    "fontSize": 18
  },
  "job": {
    "x": 400,
    "y": 165,
    "fontSize": 16
  },
  "xpBar": {
    "x": 280,
    "y": 185,
    "width": 240,
    "height": 12,
    "radius": 6,
    "bgColor": "rgba(255, 255, 255, 0.2)",
    "fillColor": "#4CAF50"
  },
  "balance": {
    "x": 400,
    "y": 235,
    "fontSize": 36
  },
  "stats": {
    "highestEarned": {
      "x": 300,
      "y": 285,
      "fontSize": 20,
      "arrowSize": 20
    },
    "highestLost": {
      "x": 530,
      "y": 285,
      "fontSize": 20,
      "arrowSize": 20
    }
  },
  "visa": {
    "x": 60,
    "y": 255,
    "width": 55,
    "height": 28
  },
  "visaNumber": {
    "x": 60,
    "y": 300,
    "fontSize": 15
  }
},
  "market": {
    "canvas": {
      "width": 900,
      "height": 550
    },
    "padding": 20,
    "radius": 35,
    "header": {
      "y": 60,
      "fontSize": 32,
      "logo": {
        "x": 60,
        "y": 30,
        "size": 40
      }
    },
    "grid": {
      "startX": 60,
      "startY": 100,
      "cardW": 240,
      "cardH": 100,
      "gapX": 30,
      "gapY": 20,
      "iconSize": 60,
      "iconPad": 15
    },
    "sidebar": {
      "x": 600,
      "lineX": 580,
      "avatar": {
        "y": 150,
        "radius": 60
      },
      "username": {
        "x": 695,
        "y": 230,
        "fontSize": 20
      },
      "money": {
        "y": 280,
        "width": 200,
        "height": 40
      },
      "inventory": {
        "y": 340,
        "width": 200,
        "height": 100,
        "lineHeight": 20
      }
    },
    "footer": {
      "y": 505,
      "legendStartX": 200
    }
  },
  "dice": {
    "canvas": {
      "width": 800,
      "height": 340
    },
    "padding": 18,
    "radius": 35,
    "header": {
      "y": 60,
      "lineY": 85,
      "logo": {
        "x": 60,
        "y": 60,
        "size": 40
      },
      "text": {
        "x": 115,
        "y": 60,
        "fontSize": 28
      },
      "menu": {
        "x": 715,
        "y": 53,
        "width": 32,
        "height": 4
      }
    },
    "vs": {
      "fontSize": 42
    },
    "avatar": {
      "player": {
        "x": 200,
        "radius": 50
      },
      "bot": {
        "x": 600,
        "radius": 50
      }
    },
    "username": {
      "fontSize": 16,
      "offsetY": 75
    },
    "dicePosition": {
      "player": {
        "x": 300
      },
      "bot": {
        "x": 460
      },
      "size": 60,
      "offsetY": -30
    },
    "amount": {
      "fontSize": 24,
      "offsetY": -70
    },
    "emoji": {
      "size": 25,
      "offsetY": 45
    },
    "indicator": {
      "width": 130,
      "height": 6,
      "offsetY": 35
    }
  },
      "land": {
        "canvas": {
          "width": 1000,
          "height": 600
        },
        "card": {
          "x": 20,
          "y": 20,
          "width": 260,
          "height": 480,
          "borderRadius": 35,
          "borderWidth": 3,
          "outerShadowOffset": 2,
          "profileCircle": {
            "xOffset": 130,
            "yOffset": 80,
            "radius": 50
          },
                  "menuList": {
                    "x": 30,
                    "y": 180,
                    "itemGap": 12,
                    "itemHeight": 38,
                    "itemBorderWidth": 2,
                    "itemBorderRadius": 20,
                    "itemPaddingLeft": 12,
                    "iconSize": 14,
                    "iconOffsetX": 10,
                    "iconOffsetY": 19,
                    "textOffsetX": 40,
                    "textFontSize": 16,
                    "items": [
                      { "key": "balance", "icon": "$", "label": "Balance", "color": "#FFECEC" },
                      { "key": "assets", "icon": "📊", "label": "Assets", "color": "#FFECEC" },
                      { "key": "income", "icon": "⏱️", "label": "Income", "suffix": "/ Min", "color": "#FFECEC" },
                      { "key": "properties", "icon": "🏠", "label": "Properties", "suffix": " Lands", "color": "#FFECEC" }
                    ]
                  }        },
    "buildings": {
      "tower": {
        "x": 620,
        "y": 100,
        "size": 80
      },
      "hospital": {
        "x": 380,
        "y": 200,
        "size": 60
      },
      "telecom": {
        "x": 500,
        "y": 180,
        "size": 60
      },
      "it": {
        "x": 740,
        "y": 200,
        "size": 60
      },
      "library": {
        "x": 380,
        "y": 320,
        "size": 50
      },
      "restaurant": {
        "x": 480,
        "y": 300,
        "size": 50
      },
      "salon": {
        "x": 580,
        "y": 320,
        "size": 50
      },
      "cafe": {
        "x": 680,
        "y": 340,
        "size": 50
      },
      "supermarket": {
        "x": 500,
        "y": 400,
        "size": 50
      }
    },
    "levelSquareRatio": 0.4
  },
  "top": {
    "canvas": {
      "width": 900,
      "height": 700
    },
    "padding": 20,
    "radius": 30,
    "title": {
      "y": 90,
      "fontSize": 48
    },
    "list": {
      "startY": 160,
      "spacing": 55,
      "fontSize": 26
    }
  },
  "text": {
    "serverName": "Anime Orbit",
    "bank": "Bank",
    "market": "سوق",
    "vs": "VS",
    "materials": {
      "wood": "خشب",
      "brick": "طوب",
      "stone": "حجر",
      "iron": "حديد",
      "steel": "فولاذ",
      "gold": "ذهب"
    },
    "buyPrice": "سعر الشراء",
    "sellPrice": "سعر البيع",
    "lastUpdate": "آخر تحديث"
  },
  "roulette": {
    "canvas": {
      "width": 800,
      "height": 600
    },
    "wheel": {
      "x": 400,
      "y": 300,
      "radius": 250,
      "borderWidth": 10,
      "borderColor": "#3A0A0A"
    },
    "segments": [
      {
        "color": "#FFC107",
        "textColor": "#000000"
      },
      {
        "color": "#4CAF50",
        "textColor": "#FFFFFF"
      },
      {
        "color": "#2196F3",
        "textColor": "#FFFFFF"
      },
      {
        "color": "#F44336",
        "textColor": "#FFFFFF"
      },
      {
        "color": "#9C27B0",
        "textColor": "#FFFFFF"
      },
      {
        "color": "#FF9800",
        "textColor": "#000000"
      },
      {
        "color": "#607D8B",
        "textColor": "#FFFFFF"
      },
      {
        "color": "#795548",
        "textColor": "#FFFFFF"
      }
    ],
    "pointer": {
      "size": 30,
      "color": "#FFD700"
    },
    "resultText": {
      "x": 400,
      "y": 300,
      "fontSize": 36,
      "color": "#FFFFFF"
    }
  },
  "gamble": {
    "canvas": {
      "width": 1220,
      "height": 512
    },
    "background": {
      "color": "#36393F"
    },
    "spots": {
      "color": "#2F3136",
      "borderColor": "#5C5E64",
      "borderWidth": 5,
      "borderRadius": 20,
      "pos1": { "x": 100, "y": 170 },
      "pos2": { "x": 250, "y": 170 },
      "pos3": { "x": 420, "y": 170 }
    },
    "overlayColor": "rgba(0,0,0,0.5)",
    "bannerAlpha": 0.6,
    "resultText": {
      "fontSize": 45,
      "fontFamily": "Cairo",
      "color": "#ffffff",
      "x": 590,
      "y": 110
    },
    "fruits": {
      "size": 150
    },
    "avatar": {
      "size": 280,
      "x": 750,
      "y": 100,
      "borderColor": "#5c5e64",
      "borderWidth": 17
    },
    "bankName": {
      "fontSize": 35,
      "fontFamily": "Cairo",
      "color": "#ffffff",
      "x": 260,
      "y": 440
    }
  }
};
      
