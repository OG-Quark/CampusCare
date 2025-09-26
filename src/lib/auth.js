import { supabase } from './supabase.js';

// Secret admin code (change this!)
const ADMIN_SECRET_CODE = 'CAMPUS_ADMIN_2024';

export const signUpNewUser = async (email, password, username) => {
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				role: 'student',
				username: username
			}
		}
	});

	if (error) throw error;
	return data;
};

export const promoteToAdminWithCode = async (secretCode) => {
	if (secretCode !== ADMIN_SECRET_CODE) {
		throw new Error('Invalid admin code');
	}

	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error('Not authenticated');

	const { error } = await supabase.auth.updateUser({
		data: {
			...user.user_metadata,
			role: 'admin'
		}
	});

	if (error) throw error;

	return { success: true, message: 'You are now an admin! Refresh the page.' };
};

export const getCurrentUserRole = async () => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	return user?.user_metadata?.role || 'student';
};

export const isAdmin = async () => {
	const role = await getCurrentUserRole();
	return role === 'admin' || role === 'super_admin';
};

export const getCurrentUser = async () => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	return user;
};
