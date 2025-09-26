import { promoteToAdminWithCode, getCurrentUser } from './auth.js';

if (typeof window !== 'undefined') {
	window.promoteToAdmin = async (code) => {
		try {
			console.log('🔑 Attempting to promote to admin...');

			const user = await getCurrentUser();
			if (!user) {
				console.error('❌ You must be logged in first!');
				return;
			}

			console.log(`👤 Logged in as: ${user.email}`);
			console.log(`📝 Current role: ${user.user_metadata?.role || 'student'}`);

			const result = await promoteToAdminWithCode(code);
			console.log('✅ ' + result.message);
			console.log('🔄 Refresh the page to see admin controls!');
		} catch (error) {
			console.error('❌ Error:', error.message);
		}
	};

	window.showAdminHelp = () => {
		console.log(`
🎯 Admin Promotion System:
   promoteToAdmin('CAMPUS_ADMIN_2024')
   becomeAdmin()
   checkMyRole()
`);
	};

	window.checkMyRole = async () => {
		const user = await getCurrentUser();
		if (!user) {
			console.log('❌ Not logged in');
			return;
		}
		console.log(`👤 Email: ${user.email}`);
		console.log(`🎯 Role: ${user.user_metadata?.role || 'student'}`);
	};

	window.becomeAdmin = async () => {
		await window.promoteToAdmin('CAMPUS_ADMIN_2024');
	};

	// Auto-show help
	setTimeout(() => {
		console.log(`
🎓 Campus Ticket System: Type 'showAdminHelp()' for admin commands
    `);
	}, 1000);
}
