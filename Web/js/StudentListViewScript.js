let studentTable = document.getElementById("studentListView");
fetch("http://localhost:8080/student")
.then(response => response.json())
.then(res =>{
    let tblBody = `    <tr>
                        <td>Student Id</td>
                        <td>First Name</td>
                        <td>Last Name</td>
                        <td>Age</td>
                        <td>Gender</td>
                        <td>Address</td>
                        <td>NIC</td>
                        </tr>`
    res.forEach(element => {
        tblBody+=`
        <tr>
        <td>${element.id}</td>
        <td>${element.firstName}</td>
        <td>${element.lastName}</td>
        <td>${element.age}</td>
        <td>${element.gender}</td>
        <td>${element.address}</td>
        <td>${element.nic}</td>
        </tr>`;
    });
    studentTable.innerHTML = tblBody;
})