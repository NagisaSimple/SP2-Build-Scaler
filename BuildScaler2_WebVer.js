/*
パーツの座標とスケールをn倍する奴
サクラエディタ2.4.3.7173にて作成&動作確認

2026/09/18 : 公開
*/

const messageText = document.getElementById("message");
const a = document.getElementById("link");

let roundScale = 20000;	//少数丸めの桁指定値
						//その場で計算させると計算誤差で汚くなるので、必ず整数の値を直接入力すること(1 / 0.00005 = 20000)

let noScaleParts = {	//Fuselage以外の普通にスケーリングすると不都合のある奴　{パーツ名:{タグ名{スケーリングしたいオプション名:[オプションが欠落している場合の初期値]}}}
	"TextureDecal-1":{"TextureDecal.State":{"position":[0,0,0], "size":[0,0,0]}},
	"TextDecal-1":{"TextureDecal.State":{"position":[0,0,0], "size":[0,0,0], "fontSize":[0]}},
	"JDriveShaft-1":{"JDriveShaft.State":{"radius":[0]}},
	"JWing-1":{"Slice":{"position":[0],"offset":[0],"scale":[0]}},
	"ControlSurface-Slat-1":{"ControlSurfacePart.State":{"range":[0,0],"startPos":[0,0],"dummyWingOffset":[0,0],"dummyWingScale":[0,0]}},
	"ControlSurface-Flap-1":{"ControlSurfacePart.State":{"range":[0,0],"startPos":[0,0],"dummyWingOffset":[0,0],"dummyWingScale":[0,0]}},
	"ControlSurface-Flap-2":{"ControlSurfacePart.State":{"range":[0,0],"startPos":[0,0],"dummyWingOffset":[0,0],"dummyWingScale":[0,0]}},
	"ControlBase-Joystick-1":{"Part":{"scale":[0]},"PositionAxis":{"scale":[0]}}
};

function buildScaler(){
	let scale = getSettings("scale");
	if((isNaN(scale)) || scale==""){
		showStatus("エラー：入力値の取得に失敗");
		return;
	}
	let text = getAllText();
	text = text.split(text.match(/\r\n/) != null ? "\r\n" : "\n");
	let oText = "";	//出力用文字列
	oText += text[0] + "\r\n";
	let aircraft = getXMLTag(text[1]);
	for(let axis = 0; axis < 3; axis++){
		aircraft[1]["paintOrigin"][axis] *= scale;
		aircraft[1]["size"][axis] *= scale;
		aircraft[1]["boundsOffset"][axis] *= scale;
		aircraft[1]["boundsMin"][axis] *= scale;
	}
	oText += list2text([aircraft]);
	let i = 2;
	while(i < text.length && text[i].match(/^ *?<Parts>/) == null){	//パーツ行が始まるまでスキップ
		oText += text[i] + "\r\n";
		i++;
	}
	if(i == text.length){
		showStatus("エラー：xmlの解析に失敗(<Parts>セクションの先頭を発見出来ず)");
		return;
	}
	//showStatus("<Parts>セクションを発見("+(i+1)+"行)");
	oText += text[i] + "\r\n";
	i++;
	let currentPart;
	while(i < text.length && text[i].match(/^ *?<\/Parts>/) == null){	//パーツ処理
		let data = text2list(text,i);
		currentPart = data[0];
		i = data[1];

		currentPart[0][1]["position"] = [fixVal(currentPart[0][1]["position"][0] * scale), fixVal(currentPart[0][1]["position"][1] * scale), fixVal(currentPart[0][1]["position"][2] * scale)];
		let partType = String(currentPart[0][1]["partType"]);
		let partScale = [scale, scale, scale];
		
		if(partType.match(/JFuselage/) != null){	//JFuselage
			if(("scale" in currentPart[0][1]) && getSettings("normalizeJFuselage")){	//スケールが変更されたJFuselageの正規化
				for(axis in partScale){
					partScale[axis] *= currentPart[0][1]["scale"][axis];
				}
				currentPart[0][1]["scale"] = [1,1,1];
			}
			for(line in currentPart){
				if(currentPart[line][0] == "JFuselage.State"){
					currentPart[line][1]["offset"] = [fixVal(currentPart[line][1]["offset"][0] * partScale[0]), fixVal(currentPart[line][1]["offset"][1] * partScale[1]), fixVal(currentPart[line][1]["offset"][2] * partScale[2])];
				}else if(currentPart[line][0] == "Slice" || currentPart[line][0] == "SectionA" || currentPart[line][0] == "SectionB"){
					currentPart[line][1]["size"] = [fixVal(currentPart[line][1]["size"][0] * partScale[0]), fixVal(currentPart[line][1]["size"][1] * partScale[1])];
					for(axis in currentPart[line][1]["cornerRadii"]){
						if(currentPart[line][1]["cornerStretch"][axis] != "True"){
							currentPart[line][1]["cornerRadii"][axis] = fixVal(currentPart[line][1]["cornerRadii"][axis] * (Number(partScale[0]) + Number(partScale[1])) / 2);
						}
					}
				}
			}
		}else if(partType in noScaleParts){	//JFuselage以外の普通にスケーリングすると不都合が出る奴
			for(line in currentPart){
				if(currentPart[line][0] in noScaleParts[partType]){
					for(option in noScaleParts[partType][currentPart[line][0]]){
						if(!(option in currentPart[line][1])){		//該当のオプションが無い場合は初期値を登録
							currentPart[line][1][option] = noScaleParts[partType][currentPart[line][0]][option];
						}
						for(axis in currentPart[line][1][option]){
							currentPart[line][1][option][axis] *= scale;
						}
					}
				}
			}
		}else{									//その他
			let includeSize = false;
			for(line in currentPart){
				if("size" in currentPart[line][1]){	//sizeオプションがあるパーツはscaleのかわりにこちらを変更
					for(axis in currentPart[line][1]["size"]){
						currentPart[line][1]["size"][axis] *= scale;
					}
					includeSize = true;
				}
			}
			if(!includeSize){	//普通にスケーリングして大丈夫な奴
				if("scale" in currentPart[0][1]){
					currentPart[0][1]["scale"] = [fixVal(currentPart[0][1]["scale"][0] * scale), fixVal(currentPart[0][1]["scale"][1] * scale), fixVal(currentPart[0][1]["scale"][2] * scale)];
				}else{
					currentPart[0][1]["scale"] = [scale, scale, scale];
				}
			}
		}
		oText += list2text(currentPart);	//編集後のパーツを出力用文字列へ追記
	}
	if(i == text.length){
		showStatus("エラー：xmlの解析に失敗(<Parts>セクションの終端を発見出来ず)");
		return;	
	}
	//showStatus("<Parts>セクションの終端を発見("+(i+1)+"行)");
	oText += text[i] + "\r\n";
	i++;
	while(i < text.length && text[i].match(/^ *?<Theme /) == null){	//パレット行が始まるまでスキップ
		oText += text[i] + "\r\n";
		i++;
	}
	if(i == text.length){
		showStatus("エラー：xmlの解析に失敗(<Theme>セクションの先頭を発見出来ず)");
		return;
	}
	//showStatus("<Theme>セクションを発見("+(i+1)+"行)");
	oText += text[i] + "\r\n";
	i++;
	let currentPaint;
	while(i < text.length && text[i].match(/^ *?<\/Theme>/) == null){	//ペイントテクスチャの処理
		let data = text2list(text,i);
		currentPaint = data[0];
		i = data[1];
		if(currentPaint.length > 1){
			const sNameList = ["textureScale", "textureOffset"];
			for(axis in currentPaint[0][1]["textureOffset"]){
				currentPaint[0][1]["textureOffset"][axis] *= scale;
			}
			for(axis in currentPaint[0][1]["textureScale"]){
				currentPaint[0][1]["textureScale"][axis] /= scale;
			}
			
		}
		oText += list2text(currentPaint);	//編集後のパレットを出力用文字列へ追記
	}
	if(i == text.length){
		showStatus("エラー：xmlの解析に失敗(<Theme>セクションの終端を発見出来ず)");
		return;	
	}
	//showStatus("<Theme>セクションの終端を発見("+(i+1)+"行)");
	oText += text[i] + "\r\n";
	i++;
	while(i < text.length){//最後までコピー
	oText += text[i] + "\r\n";
	i++;
	}
	exportText(oText);	//テキストを更新
	showStatus("完了");
	return;
}

let settings = {"roundValue":true};		//設定を保存するための物

function getSettings(key){		//設定取得(エディタ依存)----------------------------------
	switch(key){
		case "scale":
			settings[key] = document.getElementById("scale").value;
			break;
		case "roundValue":
			settings[key] = true;
			//settings[key] = document.getElementById("roundValue").checked;
			break;
		case "normalizeJFuselage":
			settings[key] = document.getElementById("JFuselageNormalize").checked;
			break;
		default:
			return null;
	}
	return settings[key];
}
document.getElementById("load").addEventListener('change', function(e){		//xml読込処理(ブラウザ用)----------------------------------
	const file = e.target.files[0];
	if (file != null){
		const reader = new FileReader();
		reader.onload = function(event){	//読込完了時の処理を予約
			loadxml(reader.result);
		};
		reader.readAsText(file);			//読込実行
	}
});

let xmlText = "";

function loadxml(iText){
	xmlText = iText;
	let name = iText.match(/Aircraft name\=\"[^\"]+/);
	if(name != null){
		document.getElementById("saveName").value = name[0].split("\"")[1];
	}else{
		showStatus("xmlの読み込みに失敗");
	}
}

function getAllText(){			//テキスト取得(ブラウザ用)----------------------------------
	return xmlText;
}

function exportText(iText){	//テキスト更新(ブラウザ用)----------------------------------
	let oText = iText.replace(/Aircraft name\=\"[^\"]+/,"Aircraft name\=\"" + document.getElementById("saveName").value);
    const url = URL.createObjectURL(new Blob([oText], { type: "application/xml" }));	//保存用URL発行
    let name = document.getElementById("saveName").value + ".xml";	//ファイル名設定
    if(name === "" || name == null)
		name = "build";
    a.download = name;	//<a>の設定を更新
    a.href = url;
    a.click();			//ダウンロード実行
    URL.revokeObjectURL(url); //保存用URL破棄
	return;
}

function showStatus(message){	//ステータスメッセージ更新(ブラウザ用)----------------------------------
	messageText.innerText = message;
	return;
}

function getXMLTag(iText){		//行内のxmlタグを扱いやすい形へ変換----------------------------------
	let data = ["", {}, "", ""];	//[タグ名, {オプション}, 冒頭(インデントとか), 末尾]
	let head = iText.match(/^ *?<[^ >]+/);		//文字列からタグ名を抜き出し
	if(head == null){
		data[0] = inStr;	//タグ名が見つからない場合はそのまま返す
		return data;
	}
	head = String(head).split("<");
	data[0] = head[1];
	data[2] = head[0] + "<";
	data[3] = iText.charAt(iText.length-2) == "/" ? " />" : ">";
	let vals = iText.match(/[^ ]+?=\".*?\"/g);	//文字列からオプションの部分を抜き出し
	if(vals != null){
		for(let i = 0; i < vals.length; i++){
			let val = vals[i].split("=\"");	//タグ名=, 値, 値...の形に分割
			let list = [];
			for(let j = 1; j < val.length; j++)		//値だけ分離
				list.push(val[j]);
			data[1][val[0]] = val[1].slice(0, -1).split(",");	//"タグ名":[値]の形で連想配列に追加
		}
	}
	return data;
}

function text2list(iText, index){	//xml文字列からパーツ情報を抽出して配列にまとめる----------------------------------
	let data = [];
	let i = index;
	data.push(getXMLTag(iText[i]));
	let endLine = new RegExp("^ *?<\\/"+data[0][0]+">");
	if(data[0][3] == ">"){
		while(iText[i].match(endLine) == null){
			i++;
			data.push(getXMLTag(iText[i]));
		}
	}
	return [data, i+1];
}

function list2text(data){		//パーツ情報をまとめた配列からxml文字列へ変換----------------------------------
	oText = "";
	for(let i = 0; i < data.length; i++){
		oText += data[i][2] + data[i][0];
		for(key in data[i][1]){
			oText += " " + key + "=\"" + data[i][1][key].join(",") + "\"";
		}
		oText += data[i][3] + "\r\n";
	}
	return oText;
}

function fixVal(inVal){	//値の小数丸め
	if(getSettings("roundValue"))
		return Math.round(inVal * roundScale) / roundScale;
	else
		return inVal;
}