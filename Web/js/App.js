const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const gender = document.getElementsByName("gender");
const age = document.getElementById("age");
const nic = document.getElementById("nic");
const address = document.getElementById("address");

const btnReg = document.getElementById("btnReg");

btnReg.addEventListener("click",()=>{
    let selGender;
    for(let i = 0; i<gender.length;i++){
        if(gender[i].checked){
            selGender = gender [i].value;
        }
    }
    
    let student = {
        "firstName": firstName.value,
        "lastName": lastName.value,
        "gender": selGender,
        "age": age.value,
        "nic": nic.value,
        "address": address.value
    }
    fetch("http://localhost:8080/student",{
        method :"POST",
        headers : {
            'Content-Type' : 'application/json'
        },
        body : JSON.stringify(student)
    })
    .then(res=>res.json())
    .then(data => {

    })
});