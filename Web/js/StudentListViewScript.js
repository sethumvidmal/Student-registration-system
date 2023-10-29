let studentTable = document.getElementById("studentListView");

fetch("http://localhost:8080/student")
    .then(response => response.json())
    .then(res => {
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
            tblBody += `
                        <tr>
                        <td><button onclick = "studentDetail(${element.id})" class="btn btn-success">${element.id}</button></td>
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


function studentDetail(id) {
    fetch(`http://localhost:8080/student/${id}`)
        .then(response => response.json())
        .then(res => {
            
            let tblBody = "";

            res.forEach(element => {
                tblBody += 
                    `<table>
                        <tr>
                            <td>
                                Id:
                            </td>
                            <td>
                                ${element.id}
                            </td>
                        </tr>
                        <tr>
                            <td>First name :</td>
                            <td>
                                ${element.firstName}
                            </td>
                        </tr>
                        <tr>
                            <td>Last name:</td>
                            <td>
                                ${element.lastName}
                            </td>
                        </tr>
                        <tr>
                            <td>Gender :</td>
                            <td>
                                ${element.gender}
                            </td>
                        </tr>
                        <tr>
                            <td>Age :</td>
                            <td>
                                ${element.age}
                            </td>
                        </tr>
                        <tr>
                            <td>NIC :</td>
                            <td>
                                ${element.nic}
                            </td>
                        </tr>
                        <tr>
                            <td>Address :</td>
                            <td>
                                ${element.address}
                                </tr>
                            </td>
                </table>`;
            });
            studentTable.innerHTML = tblBody;
        })
}