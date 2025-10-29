let API_URL = '';

async function initializeApp() {
  try {
    const response = await fetch('/config');
    const config = await response.json();
    API_URL = config.apiUrl;
    await loadUsers();
  } catch (error) {
    console.error('Error initializing app:', error);
    showToast('Error loading configuration', 'error');
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`);
    const users = await response.json();

    const usersList = document.getElementById('usersList');

    if (users.length === 0) {
      usersList.innerHTML = '<p class="text-gray-500 text-center py-4">No users found. Create one above!</p>';
      return;
    }

    usersList.innerHTML = users.map(user => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800">${user.name}</h3>
                        <p class="text-gray-600 text-sm">${user.email}</p>
                        <p class="text-gray-400 text-xs mt-1">Created: ${new Date(user.created_at).toLocaleString()}</p>
                    </div>
                    <div class="flex gap-2">
                        <button
                            onclick="editUser(${user.id}, '${user.name}', '${user.email}')"
                            class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition duration-200"
                        >
                            Edit
                        </button>
                        <button
                            onclick="deleteUser(${user.id})"
                            class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition duration-200"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Error loading users', 'error');
  }
}

document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('User created successfully!', 'success');
      document.getElementById('createUserForm').reset();
      loadUsers();
    } else {
      showToast(data.error || 'Error creating user', 'error');
    }
  } catch (error) {
    console.error('Error creating user:', error);
    showToast('Error creating user', 'error');
  }
});

async function editUser(id, currentName, currentEmail) {
  const name = prompt('Enter new name:', currentName);
  if (!name) return;

  const email = prompt('Enter new email:', currentEmail);
  if (!email) return;

  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const data = await response.json();

    if (response.ok) {
      showToast('User updated successfully!', 'success');
      loadUsers();
    } else {
      showToast(data.error || 'Error updating user', 'error');
    }
  } catch (error) {
    console.error('Error updating user:', error);
    showToast('Error updating user', 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('User deleted successfully!', 'success');
      loadUsers();
    } else {
      showToast('Error deleting user', 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Error deleting user', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastDiv = toast.querySelector('div');

  toastMessage.textContent = message;
  toastDiv.className = type === 'error'
    ? 'bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg'
    : 'bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';

  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

initializeApp();
