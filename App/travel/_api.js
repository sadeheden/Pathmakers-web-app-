const base_url = "https://pathmakers-web-app-app-travel.onrender.com/api";

export async function get(endpoint) {
    try {
        const response = await fetch(`${base_url}/${endpoint}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function post(endpoint, data) {
    try {
        const response = await fetch(`${base_url}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error posting data:', error);
        throw error;
    }
}

export async function put(endpoint, data) {
    try {
        const response = await fetch(`${base_url}/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error updating data:', error);
        throw error;
    }
}

export async function del(endpoint) {
    try {
        const response = await fetch(`${base_url}/${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error deleting data:', error);
        throw error;
    }
}
