window.__require=function t(e,i,o){function n(s,r){if(!i[s]){if(!e[s]){var c=s.split("/");if(c=c[c.length-1],!e[c]){var h="function"==typeof __require&&__require;if(!r&&h)return h(c,!0);if(a)return a(c,!0);throw new Error("Cannot find module '"+s+"'")}s=c}var l=i[s]={exports:{}};e[s][0].call(l.exports,function(t){return n(e[s][1][t]||t)},l,l.exports,t,e,i,o)}return i[s].exports}for(var a="function"==typeof __require&&__require,s=0;s<o.length;s++)n(o[s]);return n}({Actor:[function(t,e,i){"use strict";cc._RF.push(e,"459283+rN5J7olM2xZxFUJ5","Actor");var o=t("Skill");t("ZhaoShi"),cc.Class({extends:cc.Component,properties:{hpMax:10,hp:10,mpMax:0,mp:0,atk:1,def:1,nu:0,lv:0,skill:[o]},onLoad:function(){}});cc._RF.pop()},{Skill:"Skill",ZhaoShi:"ZhaoShi"}],Combat:[function(t,e,i){"use strict";cc._RF.push(e,"4e2acIvA6RNybw/SgwAaqyj","Combat");var o=t("Config").combat,n=t("Actor");t("ZhaoShi");cc.Class({extends:cc.Component,properties:{aGroup:{default:[],type:[n]},bGroup:{default:[],type:[n]},roundMax:{default:100,tooltip:"\u8d85\u8fc7\u6700\u5927\u56de\u5408\u6570\u81ea\u52a8\u7ed3\u675f\u6218\u6597",type:cc.Integer}},onLoad:function(){this.round=0,this.numOpacity=this.node.opacity,this.sizeVisible=cc.view.getVisibleSize(),this.node.width=this.sizeVisible.width,this.node.height=this.sizeVisible.height,this.node.opacity=0,console.log("====== combat onLoad =======",this),this.startBattle()},update:function(t){this.round>0&&(this.alive(this.aGroup)&&this.alive(this.bGroup)&&this.round<=this.roundMax?(this.roundEvent(),this.round++):(this.round=0,this.node.opacity=0))},startBattle:function(t,e){var i=this.aGroup,o=this.bGroup;2==arguments.length?(t instanceof Array&&(i=t),e instanceof Array&&(o=e)):1==arguments.length&&console.log("Combat.start()\u8f93\u5165\u7684\u53c2\u6570\u4e0d\u80fd\u53ea\u67091\u4e2a\uff01"),i[0].constructor==n||o[0].constructor==n?(this.node.opacity=this.numOpacity,this.initializeAll(i,o),this.round=1):console.log("Combat.start()\u7684\u89d2\u8272\u7ec4aG\u3001bG\u8d4b\u503c\u9519\u8bef\uff01")},roundEvent:function(){console.log("---\u7b2c",this.round,"\u56de\u5408\uff1a---\n")},initializeAll:function(t,e){this.initializeG(t),this.initializeG(e),console.log("-----initialize a combat: ",this)},initializeG:function(t){for(var e=t.length,i=0;i<e;i++){var o=t[i];o._atk_=o.atk,o._def_=o.def}},alive:function(t){for(var e=t.length,i=0;i<e;i++)if(t[i].hp<=0)return!1;return!0},refreshConfigs:function(t,e){var i=this.valueA(t,e),n=i+.5,a=1.5-i,s={BaoJi:o.BaoJi*n,AGe:o.AGe*a,AShan:o.AShan*a,PoFang:o.PoFang*n,DShan:o.DShan*n,SFan:o.SFan*n,GFan:o.GFan*n},r={BaoJi:o.BaoJi*a,AGe:o.AGe*n,AShan:o.AShan*n,PoFang:o.PoFang*a,DShan:o.DShan*a,SFan:o.SFan*a,GFan:o.GFan*a};this.configA=s,this.configB=r},valueA:function(t,e){var i=this.v(t);return i/(i+this.v(e))},v:function(t){return(1+.1*t.nu)*(t._atk_+t._def_+t.hpMax/o.T+t.mp)},randomFrom:function(t,e){return Math.floor(Math.random()*(e-t+1)+t)},randomNum:function(){return randomFrom(0,100)}}),cc._RF.pop()},{Actor:"Actor",Config:"Config",ZhaoShi:"ZhaoShi"}],Config:[function(t,e,i){"use strict";cc._RF.push(e,"853db4StVdKQLf92lLa2g/j","Config");e.exports={combat:{T:10,BaoJi:.1,AGe:.3,AShan:.1,PoFang:.06,DShan:.3,SFan:.2,GFan:.2}},cc._RF.pop()},{}],HpBar:[function(t,e,i){"use strict";cc._RF.push(e,"8424cyr7TRLzItWwWCl3peI","HpBar"),cc.Class({extends:cc.Component,properties:{numberNow:{default:80},numberMax:{default:100}},onLoad:function(){this.label=this.node.getChildByName("label").getComponent("cc.Label"),this.wBar=this.node.width,this.hBar=this.node.height,this.node.getChildByName("bar").height=this.hBar,this.getComponent("cc.ProgressBar").totalLength=this.wBar,this.label.fontSize=this.hBar,this.label.lineHeight=this.hBar},start:function(){this.refreshNum()},setNumberNow:function(t){this.numberNow=t},refreshNum:function(){this.getComponent("cc.ProgressBar").progress=this.numberNow/this.numberMax,this.label.string=this.numberNow.toString()+"/"+this.numberMax.toString()+" "}}),cc._RF.pop()},{}],Map:[function(t,e,i){"use strict";cc._RF.push(e,"324e09/8ohAHbwIIODDHgup","Map"),cc.Class({extends:cc.Component,properties:{backGround:{default:null,type:cc.Sprite},tiledMap:{default:null,type:cc.TiledMap},player:{default:null,type:cc.Sprite},playerTile:{default:cc.v2(0,0),tooltip:"\u89d2\u8272\u521d\u59cb\u4f4d\u7f6e\uff08tile\u5750\u6807)"},atlas:{default:null,type:cc.SpriteAtlas},deltaY:{default:16,tooltip:"\u89d2\u8272\u7ad9\u7acb\u70b9\u6bd4\u56fe\u5757\u5e95\u7aef\u9ad8\u7684\u503c"},speed:3,timeForOneFrame:.033,playerIsMoving:{default:!0,tooltip:"\u662f\u5426\u5728\u4e00\u5f00\u59cb\u8ba9\u89d2\u8272\u5411\u521d\u59cb\u4f4d\u7f6e\u79fb\u52a8"}},onLoad:function(){console.log("====== canvas Map onLoad ======"),this.timeMoving=0,this.playerTryingMove=this.playerIsMoving,this.posTouchStart=void 0,this.player.spriteFrame=this.atlas.getSpriteFrame("run_1"),this.nodeMainCamera=this.node.getChildByName("Main Camera"),this.nodeMoveArea=this.node.getChildByName("Move Area"),this.visibleSize=cc.view.getVisibleSize(),this.canvasSize=this.node.getComponent(cc.Canvas).designResolution,this.deltaH=.5*(this.visibleSize.height-this.canvasSize.height),this.posTileTop=this.getPosTileTop(),this.playerTile=this.convertPosTile2Vis(this.playerTile),console.log("cc.view = ",this.visibleSize,"canvasSize = ",this.canvasSize),this.nodeMainCamera.setPosition(this.player.node.getPosition()),this.nodeMainCamera.on("position-changed",this.onPosCameraChanged,this)},onPosCameraChanged:function(){this.nodeMoveArea.setPosition(this.nodeMainCamera.getPosition())},onMouseDown:function(t){console.log("--------onMouseDown-------");var e=t.getLocation();e=this.convertToCanvas(e);var i=this.tiledMap.getLayer("layer1").getPositionAt(this.playerTile);i.y+=this.deltaY,console.log("player's pos = ",i);var o=e.x-i.x,n=e.y-i.y,a=this.tiledMap.getTileSize(),s=a.width,r=a.height,c=o/s-n/r,h=-o/s-n/r,l=cc.v2(Math.ceil(this.playerTile.x+c),Math.ceil(this.playerTile.y+h));console.log("playerTile = ",this.playerTile,"\nnewTile = ",l),this.playerTile=l,this.playerIsMoving=!0},tryMoveByDirection:function(t){if(!this.playerIsMoving){this.changePlayerDirection(t),this.playerTryingMove=!0;var e=cc.v2(this.playerTile.x,this.playerTile.y);switch(t){case"up":e.y-=1,e.x-=1;break;case"down":e.y+=1,e.x+=1;break;case"left":e.x-=1,e.y+=1;break;case"right":e.x+=1,e.y-=1;break;case"upLeft":case"leftUp":e.x-=1;break;case"upRight":case"rightUp":e.y-=1;break;case"downLeft":case"leftDown":e.y+=1;break;case"downRight":case"rightDown":e.x+=1;break;default:return}var i=this.convertPosTile2Map(e);if(!(i.x<0||i.x>=this.sizeMapTile.width))if(!(i.y<0||i.y>=this.sizeMapTile.height))this.tiledMap.getLayer("layer1").getTileGIDAt(i)>=23||(this.playerTile=e,this.playerIsMoving=!0)}},convertPosTile2Map:function(t){var e=t.x-this.posTileTop.x,i=t.y-this.posTileTop.y;return cc.v2(e,i)},convertPosTile2Vis:function(t){return cc.v2(t.x+this.posTileTop.x,t.y+this.posTileTop.y)},convertToCanvas:function(t){var e=this.visibleSize,i=this.nodeMainCamera.getPosition();return cc.v2(t.x-e.width/2+i.x,t.y-e.height/2+this.nodeMainCamera.y)},getDirection:function(t,e){var i="";if(0===t)i=e>0?"up":"down";else{var o=e/t;o>2.414213562?i=t>0?"up":"down":o<-2.414213562?i=t>0?"down":"up":t>0?(i="right",o>.414213562?i+="Up":o<-.414213562&&(i+="Down")):t<0&&(i="left",o>.414213562?i+="Down":o<-.414213562&&(i+="Up"))}return i},getPosTileTop:function(){var t=this.tiledMap.getMapSize(),e=.5*(t.height-t.width),i=t.height-1-e;return this.sizeMapTile=t,cc.v2(e,i)},showPlayerMovingAction:function(t){this.timeMoving+=t,this.timeMoving>this.timeForOneFrame&&(this.changeSpriteFrame(),this.timeMoving=0)},changeSpriteFrame:function(t){if("string"==typeof t)this.player.spriteFrame=this.atlas.getSpriteFrame(t);else if(void 0===t){var e=this.player.spriteFrame.name;switch(e){case"run_1":e="run_2";break;case"run_2":e="run_0";break;case"run_0":e="run_1";break;default:e="run_1"}this.player.spriteFrame=this.atlas.getSpriteFrame(e)}},changePlayerDirection:function(t){t.indexOf("eft")>0?this.player.node.scaleX=-1:t.indexOf("ight")>0&&(this.player.node.scaleX=1)},update:function(t){if(this.playerTryingMove&&this.showPlayerMovingAction(t),this.playerIsMoving){var e=this.tiledMap.getLayer("layer1").getPositionAt(this.playerTile);e.y+=this.deltaY;var i=this.player.node.getPosition(),o=e.x-i.x,n=e.y-i.y,a=Math.sqrt(o*o+n*n),s=this.speed*t*100;if(a<=s)this.player.node.setPosition(e.x,e.y),this.playerIsMoving=!1,this.playerTryingMove=!1;else{var r=s/a;this.player.node.x+=r*o,this.player.node.y+=r*n}this.nodeMainCamera.setPosition(this.player.node.getPosition())}}}),cc._RF.pop()},{}],MoveStick:[function(t,e,i){"use strict";cc._RF.push(e,"1c7c65VZbZCE7xvCchawERd","MoveStick"),cc.Class({extends:cc.Component,properties:{nodeMap:{default:null,type:cc.Node},dToCenterMin:{default:15}},onLoad:function(){console.log("====== moveStick onLoad ======"),this.directionMoving="",this.radis=.5*this.node.width,this.map=this.nodeMap.getComponent("Map"),this.node.on(cc.Node.EventType.TOUCH_START,this.onTouchStart,this),this.node.on(cc.Node.EventType.TOUCH_MOVE,this.onTouchMove,this),this.node.on(cc.Node.EventType.TOUCH_END,this.onTouchEnd,this),this.node.y-=this.map.deltaH},start:function(){},update:function(t){this.directionMoving&&this.map.tryMoveByDirection(this.directionMoving)},onTouchMove:function(t){this.onTouchStart(t)},onTouchEnd:function(t){this.directionMoving="",this.map.playerTryingMove=!1},onTouchStart:function(t){var e=this.map.convertToCanvas(t.getLocation()),i=e.x,o=e.y,n=i-(this.node.x+this.map.nodeMoveArea.x),a=o-(this.node.y+this.map.nodeMoveArea.y),s=Math.sqrt(n*n+a*a);s<this.dToCenterMin||s>this.radis?(this.directionMoving="",this.map.playerTryingMove=!1):this.directionMoving=this.map.getDirection(n,a)}}),cc._RF.pop()},{}],Skill:[function(t,e,i){"use strict";cc._RF.push(e,"91a0cV5J4lBqo31hZ/g6mDY","Skill");cc.Class({extends:cc.Component,properties:{skill_name:{default:""},lv:{default:1,type:cc.Integer},type:{default:"\u5185\u529f",tooltip:"\u529f\u6cd5\u5206\u4e3a\u5185\u529f\u548c\u62db\u5f0f"},info:{default:"\u8fd9\u662f\u5bf9\u529f\u6cd5\u7684\u4ecb\u7ecd\u3002"},exp_fix:{default:10,tooltip:"\u7b49\u7ea7\u4e3alv\u65f6\u7d2f\u79ef\u83b7\u5f97\u7684\u7ecf\u9a8c\u4e3a lv^3*exp_fix",type:cc.Integer},gain:{default:[],tooltip:"\u6bcf\u7ea7\u7ed9\u4eba\u7269\u589e\u52a0\u7684hp\u3001mp\u3001atk\u3001def\u5c5e\u6027",type:[cc.Float]}},onLoad:function(){this.setLv(this.lv)},getExp:function(t){this.exp+=t,exp>=this.expNextLv&&(this.lv++,this.expNextLv=this.expOfLv(this.lv+1))},setLv:function(t){this.lv=t;var e=t;this.exp=this.expOfLv(e),e++,this.expNextLv=this.expOfLv(e)},expOfLv:function(t){this.exp_fix}});cc._RF.pop()},{}],UI:[function(t,e,i){"use strict";cc._RF.push(e,"4d35bhEXJ9B8pSRx6TSqPDu","UI"),cc.Class({extends:cc.Component,properties:{nodeMap:{default:null,type:cc.Node},nodeTop:{default:null,type:cc.Node}},onLoad:function(){console.log("==== Move Area UI onLoad ===="),this.map=this.nodeMap.getComponent("Map"),this.fitScreen()},fitScreen:function(){this.nodeTop.y+=this.map.deltaH},update:function(t){}}),cc._RF.pop()},{}],ZhaoShi:[function(t,e,i){"use strict";cc._RF.push(e,"13c3c3yjutEWIxjgg8vAM4m","ZhaoShi");var o=t("Skill");cc.Class({extends:o,properties:{eff:{default:"\u8fd0\u5c11\u91cf\u5185\u529b\u4e8e\u817f\uff0c\u53d1\u8d77\u8fc5\u731b\u7684\u96f7\u9706\u4e00\u51fb!"},mpCost:{default:0,type:cc.Integer},nuCost:{default:0,range:[0,10,1],type:cc.Integer},nuGain:{default:0,range:[0,3],type:cc.Integer},atkExtra:{default:0,tooltip:"\u672c\u56de\u5408\u8ba1\u7b97\u6982\u7387\u65f6\u7ed9\u653b\u51fb\u529b\u589e\u52a0\u7684\u503c",type:cc.Integer},defExtra:{default:0,tooltip:"\u672c\u56de\u5408\u8ba1\u7b97\u6982\u7387\u65f6\u7ed9\u9632\u5fa1\u529b\u589e\u52a0\u7684\u503c",type:cc.Integer}}});cc._RF.pop()},{Skill:"Skill"}],"use_v2.0.x_cc.Toggle_event":[function(t,e,i){"use strict";cc._RF.push(e,"421e5c+iEBF462NNbwwx7EK","use_v2.0.x_cc.Toggle_event"),cc.Toggle&&(cc.Toggle._triggerEventInScript_check=!0),cc._RF.pop()},{}]},{},["use_v2.0.x_cc.Toggle_event","Actor","Combat","Config","HpBar","Map","MoveStick","Skill","UI","ZhaoShi"]);