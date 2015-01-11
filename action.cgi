#!/usr/bin/perl

# action.cgi
#
# Perform selected tasks for the client outside of the regular refreshing
#

use CGI qw(:standard);

print "Content-type: text/html\n\n";

if(param()) {

    #All actions have these included
    $chanName = param('chan');
    $nickName = param('name');
    
    if( param('msg') ) {  #Standard chat commands

	#Get a list of all users on this channel
	@files = `ls -1 channels/$chanName/*.ncu`;

	foreach $userFile (@files) {
	    #No need to send message to self
	    if( !($userFile =~ /\/$nickName\.ncu/) ) {
		$userFile =~ s/\.ncu/.ncm/;

		chomp($userFile);

		#Check if file exists and has data (this is to determine if it needs a comma before it
		my $com = "";
		if(-e "./$userFile") {
		    $com = ",";
		}
		open(FILE , ">> $userFile") or die("action.cgi error - file write error");
		print FILE $com . '{"name":"' . $nickName . '","msg":"' . param('msg') . '"}';
		close(FILE);

	    }
	}
    }
}

else {
    die("action.cgi error - no parameters");
}

print "success";
