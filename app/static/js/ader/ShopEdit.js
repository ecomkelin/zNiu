$(function() {
	const Stint_Shop = JSON.parse($("#Stint_Shop").val());

	$("#adShopPost-Form").submit(function(e) {
		const code = $("#codeIpt").val();
		const Firm = $("#FirmIpt").val();
		if(!codeFilter(code)) {
			e.preventDefault();
		} else if(!FirmFilter(Firm)) {
			e.preventDefault();
		}
	})

	$("#adShopUpdCode-Form").submit(function(e) {
		const code = $("#codeIpt").val();
		if(!codeFilter(code)){
			e.preventDefault();
		}
	})

	$("#codeIpt").blur(function() {
		const code = $(this).val().replace(/^\s*/g,"").toUpperCase();
		$(this).val(code);
		codeFilter(code)
	})

	$("#FirmIpt").change((e) => {
		const Firm = $("#FirmIpt").val();
		FirmFilter(Firm)
	})

	const codeFilter = (code) => {
		const regexp = new RegExp(Stint_Shop.code.regexp);
		if(!code || code.length < Stint_Shop.code.min || code.length > Stint_Shop.code.max || !regexp.test(code)){
			$("#codeLabel").removeClass("text-info");
			$("#codeLabel").addClass("text-danger");
			$("#codeOpt").show();
			return false;
		} else {
			$("#codeLabel").removeClass("text-danger");
			$("#codeLabel").addClass("text-info");
			$("#codeOpt").hide();
			return true;
		}
	}

	const FirmFilter = (Firm) => {
		if(Firm == 0){
			$("#FirmLabel").removeClass("text-info");
			$("#FirmLabel").addClass("text-danger");
			$("#FirmOpt").show();
			return false;
		} else {
			$("#FirmLabel").removeClass("text-danger");
			$("#FirmLabel").addClass("text-info");
			$("#FirmOpt").hide();
			return true;
		}
	}
})