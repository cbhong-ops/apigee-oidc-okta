var res = context.getVariable("transResponse.content");
var obj = JSON.parse(res);

var resVertex;
var objVertex;
var sentimentScore;

var resmsg = {};

var originalmsg = context.getVariable("descMsg");
//var translatedmsg = context.getVariable("translatedmsg");
var srclang = context.getVariable("srclang");

var ocrlang = context.getVariable("ocrlang");
//var destlang = context.getVariable("lang");
//resmsg = { "original message": originalmsg, "translated message": translatedmsg, "source lang": srclang, "dest lang": destlang }
resmsg["ocr message"] = originalmsg;
//resmsg["translated message"] = JSON.parse(translatedmsg);
resmsg["ocr lang"] = ocrlang;
//resmsg["dest lang"] = destlang;


//if( context.getVariable("request.queryparam.sentiment") && context.getVariable("request.queryparam.sentiment") == 'true' ){
    resVertex = context.getVariable("vertexResponse.content");
    objVertex = JSON.parse(resVertex);
    
    sentimentScore = objVertex.predictions[0].sentiment;
    
    resmsg["sentiment score"] = sentimentScore;
//}

var resp = JSON.stringify(resmsg);

//context.setVariable("response.content", JSON.stringify(resmsg));
context.setVariable("response.content", resp);
 