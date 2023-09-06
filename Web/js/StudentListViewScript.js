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
                        <td><button onclick = "studentDetail(${element.id})">${element.id}</button></td>
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
            //console.log(res.firstName);
            let tblBody = "";

            res.forEach(element => {
                tblBody += 
                    `<tr>
                            <td><button onclick = "studentDetail(${element.id})">${element.id}</button></td>
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
}