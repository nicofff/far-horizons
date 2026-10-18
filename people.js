import { landmarks } from './assets/world-landmarks.js';

export const specialistSources={
  dialogue:'https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/23219',
  manual:'https://unchartedwatersnewhorizons.com/files/UWNH_manual.pdf',
  guide:'https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/9311',
};

export const lessons={
  cartography:{name:'Cartography',cost:800,effect:'Prepare sailing charts and sign a contract with a cartographer.'},
  'celestial-navigation':{name:'Celestial Navigation',cost:2000,effect:'Read the stars and sail 15% faster. Applies to the whole fleet.'},
  gunnery:{name:'Gunnery',cost:2500,effect:'Train your gun crews. Fleet broadsides deal 25% more damage.'},
};

export const specialists=[
  {id:'mercator',name:'Mercator',port:'amsterdam',kind:'cartographer',place:"Mercator's studio",skill:'cartography',lead:'wolf',
    greeting:'A coastline is a promise until someone sails it. Bring me your soundings, and we will turn the blank spaces into a chart.',
    contracted:'Your charts have a place on my table. What lies beyond the last coast we drew together?',
    appearance:{skin:'#d6a477',shade:'#ac725a',hair:'#bcb4a0',coat:'#594c70',trim:'#b8a16e',hat:'cap',beard:'full',scene:'maps'}},
  {id:'de-jode',name:'Gerard de Jode',port:'antwerp',kind:'cartographer',place:"De Jode's workshop",skill:'cartography',lead:'ribeiro',
    greeting:'The engraver cannot work from a sailor\'s guess. Set down the capes and inlets as you saw them, and I will pay for your care.',
    contracted:'Another voyage? Leave the pages here. There is room for a new plate in the press.',
    appearance:{skin:'#e0b48a',shade:'#b88268',hair:'#754d38',coat:'#355b58',trim:'#d4b47b',hat:'beret',beard:'point',scene:'maps'}},
  {id:'ribeiro',name:'Diogo Ribeiro',port:'barcelona',kind:'cartographer',place:"Ribeiro's chart room",skill:'cartography',lead:'ranajame',
    greeting:'Every master brings me a different shape for the same coast. Let us see whether your log can settle their argument.',
    contracted:'Welcome back, captain. Show me where the wind took you this time.',
    appearance:{skin:'#c58a60',shade:'#975d48',hair:'#342e35',coat:'#8a4a3a',trim:'#e0bd79',hat:'cap',beard:'moustache',scene:'maps'}},
  {id:'olives',name:'Olives',port:'palma',kind:'cartographer',place:"Olives's map room",skill:'cartography',lead:'juliano',
    greeting:'An island makes a fine place to imagine the rest of the world. Learn my craft, then bring back something worth drawing.',
    contracted:'The sea has given you more to tell me. Put your notes beside the compass.',
    appearance:{skin:'#dba26e',shade:'#ad7350',hair:'#a29d88',coat:'#476c58',trim:'#e1cc8b',hat:'beret',beard:'moustache',scene:'maps'}},
  {id:'verrazzano',name:'Giovanni da Verrazzano',port:'venice',kind:'cartographer',place:"Verrazzano's studio",skill:'cartography',lead:'joan',
    greeting:'Venice knows many roads across the sea. I am interested in the ones that have not been drawn yet.',
    contracted:'Lay out your charts. We shall see how much larger the world has become.',
    appearance:{skin:'#e1ae87',shade:'#b77b63',hair:'#3b3034',coat:'#8b3b51',trim:'#d5af69',hat:'beret',beard:'point',scene:'maps'}},
  {id:'marco',name:'Butler Marco',port:'lisbon',kind:'collector',place:'The Franco residence',factor:1.2,lead:'olives',
    greeting:'The Franco household welcomes news from abroad. Keep a proper account of what you find, and I shall see that your work is rewarded.',
    contracted:'You have returned safely. That is good news already. What wonders have you brought for the household?',
    appearance:{skin:'#d8aa83',shade:'#aa765e',hair:'#b5b3a1',coat:'#344e69',trim:'#d5be89',hat:'none',beard:'moustache',scene:'hall'}},
  {id:'joan',name:'Joan, Duke of Modena',port:'pisa',kind:'collector',place:'The Duke of Modena',factor:.6,lead:'mordes',
    greeting:'A discovery, you say? Many travellers claim to have seen marvels. I pay for accounts, not embellishments.',
    contracted:'Very well. Let me hear your report. Briefly, if you please.',
    appearance:{skin:'#deb18b',shade:'#b77c66',hair:'#59433b',coat:'#8a526e',trim:'#dfc068',hat:'jewel',beard:'none',scene:'hall'}},
  {id:'ranajame',name:'Ranajame',port:'alexandria',kind:'collector',place:"Ranajame's residence",factor:1,lead:'juliano',
    greeting:'Travellers arrive here from every sea, yet each has seen something the others have not. Tell me what you have found.',
    contracted:'Come inside. Your last account has already found eager listeners. What shall I tell them next?',
    appearance:{skin:'#af7959',shade:'#81533f',hair:'#292c34',coat:'#426b78',trim:'#d8b46b',hat:'wrap',beard:'full',scene:'hall'}},
  {id:'mordes',name:'Professor Mordes',port:'bordeaux',kind:'collector',place:"Professor Mordes's study",factor:1.5,lead:'mercator',
    greeting:'You need not dress a discovery in fine language for me. Bring your observations. A good account deserves a generous purse.',
    contracted:'Splendid, you are back! Leave nothing out. Even the smallest detail may matter.',
    appearance:{skin:'#e1b590',shade:'#bb866d',hair:'#c8c1ac',coat:'#65547d',trim:'#c8ae7d',hat:'none',beard:'full',glasses:true,scene:'books'}},
  {id:'juliano',name:'Professor Juliano',port:'naples',kind:'teacher',place:"Professor Juliano's observatory",skill:'celestial-navigation',lead:'verrazzano',
    greeting:'The coast disappears in darkness, but the stars remain. Learn to read them, and your helmsmen will spend less time correcting their course.',
    appearance:{skin:'#dab08b',shade:'#ad7b64',hair:'#c5c2ae',coat:'#384a78',trim:'#d9c286',hat:'none',beard:'point',glasses:true,scene:'stars'}},
  {id:'wolf',name:'Dr. Wolf',port:'hamburg',kind:'teacher',place:"Dr. Wolf's gun workshop",skill:'gunnery',lead:'de-jode',
    greeting:'A gun is only as useful as the crew behind it. I can teach your officers to range a target and make a broadside count.',
    appearance:{skin:'#d6a07a',shade:'#a66c56',hair:'#755742',coat:'#555e63',trim:'#bb9863',hat:'none',beard:'moustache',scene:'guns'}},
];

export const discoveryClues={
  ...Object.fromEntries(landmarks.map(d=>[d.id,d.clue])),
  volcano:'Sail southeast from the Azores toward the smaller volcanic islands. A mountain there glows after dark.',
  reef:'North of the Lesser Antilles, sailors speak of a wide bank of turquoise water. Search northeast of the Caribbean islands.',
  falls:'On the South American coast, east of the Amazon\'s mouth, there are reports of water falling from green cliffs.',
  penguins:'Look on the Atlantic approach to southern Africa, northwest of the Cape. Sailors have seen birds that walk but never fly.',
  baobab:'Cross the channel east of Mozambique. The western coast of Madagascar is said to have trees wider than a house.',
  atoll:'Far south of India, in the central Indian Ocean, a pilot described seven rings of coral surrounding still water.',
};
