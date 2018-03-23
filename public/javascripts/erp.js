let socket = io.connect({query: {sessionId: 'cde'}});

$(document).ready(function(){
  socket.on('payment', function(msg){
    div = newPaymentDiv(msg);
    let li = document.createElement("li");
    li.className = "list-group-item";
    li.appendChild(div);
    $(li)
    .hide()
    .css('opacity',0.0)
    .prependTo('#listContainer')
    .slideDown('slow')
    .animate({opacity: 1.0})
  });
})

let parser = new DOMParser();
function newPaymentDiv(args) {
  const fromId = "from";
  const toId = "to";
  const paidId = "paid";
  const nameId = "name";
  let paymentHtml = '<div id="containerDiv" class="container-fluid"><div class="row"><div class="col-sm-1"><img src="/public/images/id.png" class="img-fluid"/></div><div class="col-sm-11"><div class="row"><div class="col-sm-4"><h5 id="name">Checked Out</h5></div></div><div class="row"><div class="col-sm-2">Amount: ₹ <strong id="paid">3000</strong></div><div class="col-sm-5">From: <strong id="from">0x0</strong></div><div class="col-sm-5">To: <strong id="to">0x0</strong></div></div></div></div></div>';
  let paymentDom = parser.parseFromString(paymentHtml, "text/html");
  paymentDom.getElementById(fromId).innerHTML = moment(args.checkInTimeStamp, "x").format("DD/MM, h:mm:ss a");
  paymentDom.getElementById(toId).innerHTML = moment(args.checkOutTimeStamp, "x").format("DD/MM, h:mm:ss a");
  paymentDom.getElementById(paidId).innerHTML = args.payedAmount;
  paymentDom.getElementById(nameId).innerHTML = args.guestName;
  return paymentDom.getElementById("containerDiv") ;
}