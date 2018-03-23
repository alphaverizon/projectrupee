$(document).ready(function() {
	$('#loginButton').click(function() {
		let loginData = {user:$('#username').val(), password:$('#password').val(), vpa:$('#vpa').val()};
		$.post('/contract/login', loginData, function(result) {
			window.location.href = '/contract/contractor';
		});
	});
})

function checkValues() {
	if ($("#username").val().length != 0 && $("#password").val().length != 0 && $("#vpa").val().includes("@")) {
		$("#loginButton").removeClass("hidden").animate({ left: '250px' });;
		$("#lock").addClass("hidden").animate({ left: '250px' });;
	} else {
		$("#loginButton").addClass("hidden").animate({ right: '250px' });
		$("#lock").removeClass("hidden").animate({ right: '250px' });;			
	}
}
