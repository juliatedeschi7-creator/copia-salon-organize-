import React from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const AdminPage = () => {
  // Sample data, replace with actual data from your application
  const data = [
    { id: 1, name: 'Item 1', is_approved: true },
    { id: 2, name: 'Item 2', is_approved: false },
    { id: 3, name: 'Item 3', is_approved: true },
  ];

  // Filtering logic
  const approvedData = data.filter(item => item.is_approved);

  return (
    <div>
      <h1>Admin Page</h1>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {approvedData.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.is_approved ? 'Approved' : 'Not Approved'}</td>
              <td><Link to={`/edit/${item.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default AdminPage;