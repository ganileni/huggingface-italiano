import { parse } from 'acorn';
import {readFileSync} from 'node:fs';
const sourceKeys=new Set(JSON.parse(readFileSync(new URL('../upstream/source-ids.json',import.meta.url),'utf8')));
let source='';for await(const chunk of process.stdin)source+=chunk;
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true});
const literals=[];
function keyOf(property){return property?.type==='Property'?(property.key.name??property.key.value??''):'';}
function walk(node,parent,protectedArray=false,property=''){
 if(!node||typeof node!=='object')return;
 if(node.type==='Property')property=keyOf(node);
 if(node.type==='ArrayExpression'&&parent?.type==='Property'&&sourceKeys.has(String(keyOf(parent))))protectedArray=true;
 if(node.type==='Literal'&&typeof node.value==='string')literals.push({start:node.start,end:node.end,value:node.value,property,isKey:parent?.type==='Property'&&parent.key===node,direct:parent?.type==='Property'&&parent.value===node,protected:protectedArray||Boolean(parent?.directive)||['quote','passage'].includes(property)});
 for(const [key,value]of Object.entries(node)){
  if(['start','end','raw','regex','bigint'].includes(key))continue;
  if(Array.isArray(value)){for(const child of value)if(child&&typeof child.type==='string')walk(child,node,protectedArray,property);}
  else if(value&&typeof value.type==='string')walk(value,node,protectedArray,property);
 }
}
walk(ast,null);process.stdout.write(JSON.stringify(literals));
